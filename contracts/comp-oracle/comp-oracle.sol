// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.6.0;

import { DSNote } from "../ds-note/note.sol";
import { DSToken } from "../ds-token/token.sol";
import { PipLike } from "../dss/spot.sol";

interface CompLike {
    function exchangeRateStored() external view returns (uint256 _exchangeRate);
    function underlying() external view returns (address _token);
}

contract CompOracle is DSNote, PipLike {

    // --- Auth ---
    mapping (address => uint256) public wards;
    function rely(address _usr) external note auth { wards[_usr] = 1;  }
    function deny(address _usr) external note auth { wards[_usr] = 0; }
    modifier auth {
        require(wards[msg.sender] == 1, "CompOracle/not-authorized");
        _;
    }

    // --- Math ---
    function mul(uint x, uint y) internal pure returns (uint z) {
        require(y == 0 || (z = x * y) / y == x);
    }

    address public immutable ctoken; // cToken for which shares are being priced
    uint256 public immutable factor; // price divisor

    address public orb;              // oracle for the underlying token

    // --- Whitelisting ---
    mapping (address => uint256) public bud;
    modifier toll { require(bud[msg.sender] == 1, "CompOracle/contract-not-whitelisted"); _; }

    constructor (address _ctoken, address _underlying, address _orb) public {
        require(_ctoken                     !=                     address(0), "CompOracle/invalid-ctoken-address");
        require(DSToken(_ctoken).decimals() ==                              8, "CompOracle/invalid-dec-places");
        require(_orb                        !=                     address(0), "CompOracle/invalid-oracle-address");
        require(_underlying                 == CompLike(_ctoken).underlying(), "CompOracle/invalid-underlying-address");
        uint8 _dec = DSToken(_underlying).decimals();
        require(_dec                        <=                             18, "CompOracle/invalid-underlying-dec-places");
        wards[msg.sender] = 1;
        ctoken = _ctoken;
        orb = _orb;
        factor = 10 ** (10 + uint256(_dec));
    }

    function link(address _orb) external note auth {
        require(_orb != address(0), "CompOracle/no-contract");
        orb = _orb;
    }

    function read() external view override toll returns (bytes32) {
        uint256 underlyingPrice = uint256(PipLike(orb).read());
        require(underlyingPrice != 0, "CompOracle/invalid-oracle-price");

        uint256 exchangeRate = CompLike(ctoken).exchangeRateStored();
        require(exchangeRate != 0, "CompOracle/invalid-exchange-rate");

        uint256 sharePrice = mul(underlyingPrice, exchangeRate) / factor;
        require(sharePrice > 0, "CompOracle/invalid-price-feed");

        return bytes32(sharePrice);
    }

    function peek() external view override toll returns (bytes32,bool) {
        (bytes32 _underlyingPrice, bool valid) = PipLike(orb).peek();
        uint256 underlyingPrice = uint256(_underlyingPrice);
        if (valid) valid = underlyingPrice != 0;

        uint256 exchangeRate = CompLike(ctoken).exchangeRateStored();
        if (valid) valid = exchangeRate != 0;

        uint256 sharePrice = mul(underlyingPrice, exchangeRate) / factor;
        if (valid) valid = sharePrice > 0;

        return (bytes32(sharePrice), valid);
    }

    function kiss(address a) external note auth {
        require(a != address(0), "CompOracle/no-contract-0");
        bud[a] = 1;
    }

    function diss(address a) external note auth {
        bud[a] = 0;
    }

    function kiss(address[] calldata a) external note auth {
        for(uint i = 0; i < a.length; i++) {
            require(a[i] != address(0), "CompOracle/no-contract-0");
            bud[a[i]] = 1;
        }
    }

    function diss(address[] calldata a) external note auth {
        for(uint i = 0; i < a.length; i++) {
            bud[a[i]] = 0;
        }
    }
}
