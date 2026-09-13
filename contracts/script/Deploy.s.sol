// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {XeniaRegistry} from "../src/XeniaRegistry.sol";

/// @notice Deploy XeniaRegistry. Default dispute window: 10 seconds (fast demo).
contract Deploy is Script {
    function run() external {
        uint256 disputeWindow = vm.envOr("DISPUTE_WINDOW", uint256(10));
        uint256 pk = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(pk);
        XeniaRegistry registry = new XeniaRegistry(disputeWindow);
        vm.stopBroadcast();

        console2.log("XeniaRegistry deployed at:", address(registry));
        console2.log("disputeWindow (seconds):", disputeWindow);
    }
}
