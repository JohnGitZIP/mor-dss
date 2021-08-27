// SPDX-License-Identifier: AGPL-3.0-or-later

/// RestrictedTokenFaucet.sol

// Copyright (C) 2019-2020 Maker Ecosystem Growth Holdings, INC.

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

pragma solidity >=0.5.0;

import { DSNote } from "../ds-note/note.sol";
import { DSToken } from "../ds-token/token.sol";

contract RestrictedTokenFaucet is DSNote {
    // --- Auth ---
    mapping (address => uint256) public wards;
    function rely(address guy) public auth note { wards[guy] = 1; }
    function deny(address guy) public auth note { wards[guy] = 0; }
    modifier auth {
        require(wards[msg.sender] == 1, "token-faucet/no-auth");
        _;
    }
    // --- Gulp Whitelist ---
    mapping (address => uint256) public list;
    function hope(address guy) public auth note { list[guy] = 1; }
    function nope(address guy) public auth note { list[guy] = 0; }

    mapping (address => uint256) public amt;
    mapping (address => mapping (address => bool)) public done;

    constructor () public {
        wards[msg.sender] = 1;
        list[msg.sender] = 1;
    }

    function mul(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require(y == 0 || (z = x * y) / y == x, "token-faucet/mul-overflow");
    }

    function gulp(address gem) external  {
        require(list[address(0)] == 1 || list[msg.sender] == 1, "token-faucet/no-whitelist");
        require(!done[msg.sender][gem], "token-faucet/already-used_faucet");
        require(DSToken(gem).balanceOf(address(this)) >= amt[gem], "token-faucet/not-enough-balance");
        done[msg.sender][gem] = true;
        DSToken(gem).transfer(msg.sender, amt[gem]);
    }

    function gulp(address gem, address[] calldata addrs) external {
        require(DSToken(gem).balanceOf(address(this)) >= mul(amt[gem], addrs.length), "token-faucet/not-enough-balance");

        for (uint256 i = 0; i < addrs.length; i++) {
            require(list[address(0)] == 1 || list[addrs[i]] == 1, "token-faucet/no-whitelist");
            require(!done[addrs[i]][address(gem)], "token-faucet/already-used-faucet");
            done[addrs[i]][address(gem)] = true;
            DSToken(gem).transfer(addrs[i], amt[gem]);
        }
    }

    function shut(DSToken gem) external auth {
        gem.transfer(msg.sender, gem.balanceOf(address(this)));
    }

    function undo(address usr, address gem) external auth note {
        done[usr][gem] = false;
    }

    function setAmt(address gem, uint256 amt_) external auth note {
        amt[gem] = amt_;
    }
}
