// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.6.0;

import { DSNote } from "../ds-note/note.sol";
import { DSToken } from "../ds-token/token.sol";
import { PipLike } from "../dss/spot.sol";

contract XSushiOracle is DSNote, PipLike {

    // --- Auth ---
    mapping (address => uint256) public wards;
    function rely(address _usr) external note auth { wards[_usr] = 1;  }
    function deny(address _usr) external note auth { wards[_usr] = 0; }
    modifier auth {
        require(wards[msg.sender] == 1, "XSushiOracle/not-authorized");
        _;
    }

    // --- Math ---
    function mul(uint x, uint y) internal pure returns (uint z) {
        require(y == 0 || (z = x * y) / y == x);
    }

    address public immutable xtoken; // xsushi like token being priced
    address public immutable token;  // sushi like underlying reserve token

    address public orb;              // oracle for the reserve token

    // --- Whitelisting ---
    mapping (address => uint256) public bud;
    modifier toll { require(bud[msg.sender] == 1, "XSushiOracle/contract-not-whitelisted"); _; }

    constructor (address _xtoken, address _token, address _orb) public {
        require(_xtoken != address(0), "XSushiOracle/invalid-xtoken-address");
        require(_token  != address(0), "XSushiOracle/invalid-token-address");
        require(_orb    != address(0), "XSushiOracle/invalid-oracle-address");
        require(DSToken(_xtoken).decimals() == DSToken(_token).decimals(), "XSushiOracle/token-dec-mismatch");
        wards[msg.sender] = 1;
        xtoken = _xtoken;
        token = _token;
        orb = _orb;
    }

    function link(address _orb) external note auth {
        require(_orb != address(0), "XSushiOracle/no-contract");
        orb = _orb;
    }

    function read() external view override toll returns (bytes32) {
        uint256 reservePrice = uint256(PipLike(orb).read());
        require(reservePrice != 0, "XSushiOracle/invalid-oracle-price");

        uint256 reserve = DSToken(token).balanceOf(xtoken);
        uint256 supply = DSToken(xtoken).totalSupply();
        require(reserve > 0 && supply > 0, "XSushiOracle/empty-vault");

        uint256 sharePrice = mul(reservePrice, reserve) / supply;
        require(sharePrice > 0, "XSushiOracle/invalid-price-feed");

        return bytes32(sharePrice);
    }

    function peek() external view override toll returns (bytes32,bool) {
        (bytes32 _reservePrice, bool valid) = PipLike(orb).peek();
        uint256 reservePrice = uint256(_reservePrice);
        if (valid) valid = reservePrice != 0;

        uint256 reserve = DSToken(token).balanceOf(xtoken);
        uint256 supply = DSToken(xtoken).totalSupply();
        if (valid) valid = reserve > 0 && supply > 0;

        uint256 sharePrice = supply > 0 ? mul(reservePrice, reserve) / supply : 0;
        if (valid) valid = sharePrice > 0;

        return (bytes32(sharePrice), valid);
    }

    function kiss(address a) external note auth {
        require(a != address(0), "XSushiOracle/no-contract-0");
        bud[a] = 1;
    }

    function diss(address a) external note auth {
        bud[a] = 0;
    }

    function kiss(address[] calldata a) external note auth {
        for(uint i = 0; i < a.length; i++) {
            require(a[i] != address(0), "XSushiOracle/no-contract-0");
            bud[a[i]] = 1;
        }
    }

    function diss(address[] calldata a) external note auth {
        for(uint i = 0; i < a.length; i++) {
            bud[a[i]] = 0;
        }
    }
}
