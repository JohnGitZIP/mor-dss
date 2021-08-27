// SPDX-License-Identifier: AGPL-3.0-or-later

/// OsmMom -- governance interface for the OSM

// Copyright (C) 2019 Maker Ecosystem Growth Holdings, INC.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published
// by the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

pragma solidity >=0.5.12;

import { DSNote } from "../ds-note/note.sol";
import { OSM } from "../osm/osm.sol";
import { DSAuthority } from "../ds-auth/auth.sol";

contract OsmMom is DSNote {

    address public owner;
    modifier onlyOwner { require(msg.sender == owner, "osm-mom/only-owner"); _;}

    address public authority;
    modifier auth {
        require(isAuthorized(msg.sender, msg.sig), "osm-mom/not-authorized");
        _;
    }
    function isAuthorized(address src, bytes4 sig) internal view returns (bool) {
        if (src == address(this)) {
            return true;
        } else if (src == owner) {
            return true;
        } else if (authority == address(0)) {
            return false;
        } else {
            return DSAuthority(authority).canCall(src, address(this), sig);
        }
    }

    mapping (bytes32 => address) public osms;

    constructor() public {
        owner = msg.sender;
    }

    function setOsm(bytes32 ilk, address osm) external note onlyOwner {
        osms[ilk] = osm;
    }

    function setOwner(address owner_) external note onlyOwner {
        owner = owner_;
    }

    function setAuthority(address authority_) external note onlyOwner {
        authority = authority_;
    }

    function stop(bytes32 ilk) external note auth {
        OSM(osms[ilk]).stop();
    }
}
