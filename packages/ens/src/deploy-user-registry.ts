/**
 * Deploy a UserRegistry for xenia.eth subnames and attach it via setSubregistry.
 * Writes ENS_REGISTRY_ADDRESS to stdout; paste into .env after success.
 */
import { loadRootEnv } from '@xenia/config';
import {
  createPublicClient,
  createWalletClient,
  encodeAbiParameters,
  encodeFunctionData,
  http,
  keccak256,
  namehash,
  parseAbi,
  parseEventLogs,
  stringToHex,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

loadRootEnv(import.meta.url);

const VERIFIABLE_FACTORY = '0x10dC6333CDFe1FCEf624c6e0a8221b91804Cd7ef' as const;
const USER_REGISTRY_IMPL = '0x624a25d67B59D587752EbEc8DdeD8827dAe52050' as const;
const ETH_REGISTRY = '0xBDC85dD5b15D7ecb354cd7cb6f2c50b4f2c4F0E2' as const;

const PARENT = process.env.ENS_PARENT_NAME ?? 'xenia.eth';
const LABEL = PARENT.replace(/\.eth$/, '');

/** All roles + admin counterparts bitmap from ENSv2 docs */
const ALL_ROLES =
  0x1111111111111111111111111111111111111111111111111111111111111111n;

const verifiableFactoryAbi = parseAbi([
  'function deployProxy(address implementation, uint256 salt, bytes data)',
  'event ProxyDeployed(address indexed sender, address indexed proxyAddress, uint256 salt, address implementation)',
]);

const registryInitAbi = parseAbi([
  'function initialize(address rootAccount, uint256 roleBitmap)',
]);

const ethRegistryAbi = parseAbi([
  'function setSubregistry(uint256 anyId, address subregistry)',
  'function getSubregistry(string label) view returns (address)',
]);

async function main() {
  const pk = process.env.ENS_OWNER_PRIVATE_KEY as Hex | undefined;
  if (!pk) throw new Error('ENS_OWNER_PRIVATE_KEY required');

  const rpc = process.env.SEPOLIA_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com';
  const account = privateKeyToAccount(pk.startsWith('0x') ? pk : (`0x${pk}` as Hex));
  const publicClient = createPublicClient({ chain: sepolia, transport: http(rpc) });
  const wallet = createWalletClient({ account, chain: sepolia, transport: http(rpc) });

  const bal = await publicClient.getBalance({ address: account.address });
  console.log(`Owner ${account.address} balance: ${Number(bal) / 1e18} ETH`);
  if (bal === 0n) {
    throw new Error(
      'Owner has 0 Sepolia ETH. Fund 0x44ceC583971bEDb52934652F406A152f3C8aFb13 then re-run.',
    );
  }

  const existing = await publicClient.readContract({
    address: ETH_REGISTRY,
    abi: ethRegistryAbi,
    functionName: 'getSubregistry',
    args: [LABEL],
  });
  if (existing !== '0x0000000000000000000000000000000000000000') {
    console.log(`Subregistry already set: ${existing}`);
    console.log(`\nAdd to .env:\nENS_REGISTRY_ADDRESS=${existing}`);
    return;
  }

  const version = 0n;
  const registrySalt = BigInt(
    keccak256(
      encodeAbiParameters(
        [{ type: 'bytes32' }, { type: 'bytes32' }, { type: 'uint256' }],
        [keccak256(stringToHex('UserRegistry')), namehash(PARENT), version],
      ),
    ),
  );

  const registryInitData = encodeFunctionData({
    abi: registryInitAbi,
    functionName: 'initialize',
    args: [account.address, ALL_ROLES],
  });

  console.log(`Deploying UserRegistry for ${PARENT}…`);
  const deployHash = await wallet.writeContract({
    address: VERIFIABLE_FACTORY,
    abi: verifiableFactoryAbi,
    functionName: 'deployProxy',
    args: [USER_REGISTRY_IMPL, registrySalt, registryInitData],
    account,
    chain: sepolia,
  });
  const deployReceipt = await publicClient.waitForTransactionReceipt({ hash: deployHash });
  const [deployLog] = parseEventLogs({
    abi: verifiableFactoryAbi,
    eventName: 'ProxyDeployed',
    logs: deployReceipt.logs,
  });
  const registryAddress = deployLog.args.proxyAddress as `0x${string}`;
  console.log(`UserRegistry: ${registryAddress} (tx ${deployHash})`);

  const labelhash = BigInt(keccak256(stringToHex(LABEL)));
  console.log(`setSubregistry("${LABEL}") → ${registryAddress}`);
  const setHash = await wallet.writeContract({
    address: ETH_REGISTRY,
    abi: ethRegistryAbi,
    functionName: 'setSubregistry',
    args: [labelhash, registryAddress],
    account,
    chain: sepolia,
  });
  await publicClient.waitForTransactionReceipt({ hash: setHash });
  console.log(`Attached (tx ${setHash})`);

  console.log(`\nAdd to .env:\nENS_REGISTRY_ADDRESS=${registryAddress}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
