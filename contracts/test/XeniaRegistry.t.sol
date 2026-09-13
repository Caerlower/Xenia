// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {XeniaRegistry} from "../src/XeniaRegistry.sol";

contract XeniaRegistryTest is Test {
    XeniaRegistry internal registry;

    address internal agent = makeAddr("agent");
    address internal host = makeAddr("host");
    address internal victim = makeAddr("victim");

    bytes32 internal constant ENS_NODE = keccak256("agent-1.xenia.eth");

    uint256 internal constant DISPUTE_WINDOW = 180;
    uint256 internal constant STAKE = 1 ether;
    uint256 internal constant PREMIUM = 0.01 ether;

    function setUp() public {
        registry = new XeniaRegistry(DISPUTE_WINDOW);
        vm.deal(host, 10 ether);
        vm.deal(agent, 1 ether);
    }

    function _registerAndBack() internal returns (bytes32 backingId) {
        vm.prank(agent);
        registry.registerAgent(ENS_NODE);

        vm.prank(host);
        backingId = registry.createBacking{value: STAKE}(agent, STAKE, PREMIUM);
    }

    function test_registerAndCreateBacking() public {
        bytes32 id = _registerAndBack();
        XeniaRegistry.Backing memory b = registry.getBacking(id);
        assertEq(b.agent, agent);
        assertEq(b.host, host);
        assertEq(b.stakeAmount, STAKE);
        assertEq(uint256(b.status), uint256(XeniaRegistry.BackingStatus.Active));
        assertTrue(registry.isInGoodStanding(agent));
    }

    function test_payPremium() public {
        bytes32 id = _registerAndBack();
        uint256 hostBefore = host.balance;

        vm.prank(agent);
        registry.payPremium{value: PREMIUM}(id);

        assertEq(host.balance, hostBefore + PREMIUM);
        assertEq(registry.getBacking(id).premiumsPaid, 1);
    }

    function test_slashFlow() public {
        bytes32 id = _registerAndBack();

        vm.prank(victim);
        registry.reportDefault(id, victim);

        vm.warp(block.timestamp + DISPUTE_WINDOW + 1);

        uint256 victimBefore = victim.balance;
        registry.resolveDispute(id, true);

        assertEq(victim.balance, victimBefore + STAKE);
        assertEq(uint256(registry.getBacking(id).status), uint256(XeniaRegistry.BackingStatus.Slashed));
        assertFalse(registry.isInGoodStanding(agent));
    }

    function test_revokeBacking() public {
        bytes32 id = _registerAndBack();
        uint256 hostBefore = host.balance;

        vm.prank(host);
        registry.revokeBacking(id);

        assertEq(host.balance, hostBefore + STAKE);
        assertEq(uint256(registry.getBacking(id).status), uint256(XeniaRegistry.BackingStatus.Revoked));
    }

    function test_cannotRevokeDuringDispute() public {
        bytes32 id = _registerAndBack();
        registry.reportDefault(id, victim);

        vm.prank(host);
        vm.expectRevert(XeniaRegistry.ActiveDispute.selector);
        registry.revokeBacking(id);
    }
}
