 // SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract FooCoin is ERC20 {
    address public owner;

    constructor(uint256 initialAmount) ERC20("TestERC", "TST") {
        owner = msg.sender;
        _mint(msg.sender, initialAmount);
    }

    function mintMore(uint256 _amount) public {
        // require(msg.sender == owner, "Only Owner can call this fxn!");
        _mint(msg.sender, _amount);
    }
}