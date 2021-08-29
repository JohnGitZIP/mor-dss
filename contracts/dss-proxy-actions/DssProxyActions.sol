// SPDX-License-Identifier: AGPL-3.0-or-later

/// DssProxyActions.sol

// Copyright (C) 2018-2020 Maker Ecosystem Growth Holdings, INC.

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

pragma solidity >=0.5.12;

import { Vat } from "../dss/vat.sol";
import { DaiJoin, GemJoin } from "../dss/join.sol";
import { Dai } from "../dss/dai.sol";
import { End } from "../dss/end.sol";
import { Pot } from "../dss/pot.sol";
import { Jug } from "../dss/jug.sol";
import { DssCdpManager } from "../dss-cdp-manager/DssCdpManager.sol";
import { ProxyRegistry } from "../proxy-registry/ProxyRegistry.sol";
import { DSProxy } from "../ds-proxy/proxy.sol";
import { DSToken } from "../ds-token/token.sol";
/*
import { WETH9_ } from "../ds-weth/weth9.sol";
import { GemJoin4 } from "../dss-gem-joins/join-4.sol";
*/

abstract contract DSVault is DSToken {
    function totalReserve() external view virtual returns (uint256 _totalReserve);
    function deposit(uint256 _amount, uint256 _minShares, bool _execGulp) external virtual;
    function withdraw(uint256 _shares, uint256 _minAmount, bool _execGulp) external virtual;
	function gulp() external virtual;
}

interface HopeLike {
    function hope(address) external;
    function nope(address) external;
}

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// WARNING: These functions meant to be used as a a library for a DSProxy. Some are unsafe if you call them directly.
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

contract Common {
    uint256 constant RAY = 10 ** 27;

    // Internal functions

    function _add(uint x, uint y) internal pure returns (uint z) {
        require((z = x + y) >= x, "add-overflow");
    }

    function _mul(uint x, uint y) internal pure returns (uint z) {
        require(y == 0 || (z = x * y) / y == x, "mul-overflow");
    }

    // Public functions

    function daiJoin_join(address apt, address urn, uint wad) public {
        Dai dai = DaiJoin(apt).dai();
        // Gets DAI from the user's wallet
        dai.transferFrom(msg.sender, address(this), wad);
        // Approves adapter to take the DAI amount
        dai.approve(apt, wad);
        // Joins DAI into the vat
        DaiJoin(apt).join(urn, wad);
    }
}

contract DssProxyActions is Common {
    // Internal functions

    function _sub(uint x, uint y) internal pure returns (uint z) {
        require((z = x - y) <= x, "sub-overflow");
    }

    function toInt(uint x) internal pure returns (int y) {
        y = int(x);
        require(y >= 0, "int-overflow");
    }

    function toRad(uint wad) internal pure returns (uint rad) {
        rad = _mul(wad, 10 ** 27);
    }

    function convertTo18(address gemJoin, uint256 amt) internal view returns (uint256 wad) {
        // For those collaterals that have less than 18 decimals precision we need to do the conversion before passing to frob function
        // Adapters will automatically handle the difference of precision
        wad = _mul(
            amt,
            10 ** (18 - GemJoin(gemJoin).dec())
        );
    }

    function _getDrawDart(
        address vat,
        address jug,
        address urn,
        bytes32 ilk,
        uint wad
    ) internal returns (int dart) {
        // Updates stability fee rate
        uint rate = Jug(jug).drip(ilk);

        // Gets DAI balance of the urn in the vat
        uint dai = Vat(vat).dai(urn);

        // If there was already enough DAI in the vat balance, just exits it without adding more debt
        if (dai < _mul(wad, RAY)) {
            // Calculates the needed dart so together with the existing dai in the vat is enough to exit wad amount of DAI tokens
            dart = toInt(_sub(_mul(wad, RAY), dai) / rate);
            // This is neeeded due lack of precision. It might need to sum an extra dart wei (for the given DAI wad amount)
            dart = _mul(uint(dart), rate) < _mul(wad, RAY) ? dart + 1 : dart;
        }
    }

    function _getWipeDart(
        address vat,
        uint dai,
        address urn,
        bytes32 ilk
    ) internal view returns (int dart) {
        // Gets actual rate from the vat
        (, uint rate,,,) = Vat(vat).ilks(ilk);
        // Gets actual art value of the urn
        (, uint art) = Vat(vat).urns(ilk, urn);

        // Uses the whole dai balance in the vat to reduce the debt
        dart = toInt(dai / rate);
        // Checks the calculated dart is not higher than urn.art (total debt), otherwise uses its value
        dart = uint(dart) <= art ? - dart : - toInt(art);
    }

    function _getWipeAllWad(
        address vat,
        address usr,
        address urn,
        bytes32 ilk
    ) internal view returns (uint wad) {
        // Gets actual rate from the vat
        (, uint rate,,,) = Vat(vat).ilks(ilk);
        // Gets actual art value of the urn
        (, uint art) = Vat(vat).urns(ilk, urn);
        // Gets actual dai amount in the urn
        uint dai = Vat(vat).dai(usr);

        uint rad = _sub(_mul(art, rate), dai);
        wad = rad / RAY;

        // If the rad precision has some dust, it will need to request for 1 extra wad wei
        wad = _mul(wad, RAY) < rad ? wad + 1 : wad;
    }

    // Public functions

    function transfer(address gem, address dst, uint amt) public {
        DSToken(gem).transfer(dst, amt);
    }
/*
    function ethJoin_join(address apt, address urn) public payable {
        WETH9_ gem = WETH9_(payable(address(GemJoin(apt).gem())));
        // Wraps ETH in WETH
        gem.deposit{value: msg.value}();
        // Approves adapter to take the WETH amount
        gem.approve(address(apt), msg.value);
        // Joins WETH collateral into the vat
        GemJoin(apt).join(urn, msg.value);
    }
*/
    function gemJoin_join(address apt, address urn, uint amt, bool transferFrom, address res) public {
        // Only executes for tokens that have approval/transferFrom implementation
        if (transferFrom) {
            DSToken gem = GemJoin(apt).gem();
            // Gets token from the user's wallet
            if (res == address(0)) {
                gem.transferFrom(msg.sender, address(this), amt);
            } else {
                DSVault(address(gem)).gulp();
                uint256 supply = DSVault(address(gem)).totalSupply();
                uint256 reserve = DSVault(address(gem)).totalReserve();
                uint256 resAmt = _add(_mul(amt, reserve), supply - 1) / supply;
                DSToken(res).transferFrom(msg.sender, address(this), resAmt);
                DSToken(res).approve(address(gem), resAmt);
                DSVault(address(gem)).deposit(resAmt, 1, false);
            }
            // Approves adapter to take the token amount
            gem.approve(apt, amt);
        }
        // Joins token collateral into the vat
        GemJoin(apt).join(urn, amt);
    }

    function hope(
        address obj,
        address usr
    ) public {
        HopeLike(obj).hope(usr);
    }

    function nope(
        address obj,
        address usr
    ) public {
        HopeLike(obj).nope(usr);
    }

    function open(
        address manager,
        bytes32 ilk,
        address usr
    ) public returns (uint cdp) {
        cdp = DssCdpManager(manager).open(ilk, usr);
    }

    function give(
        address manager,
        uint cdp,
        address usr
    ) public {
        DssCdpManager(manager).give(cdp, usr);
    }

    function giveToProxy(
        address proxyRegistry,
        address manager,
        uint cdp,
        address dst
    ) public {
        // Gets actual proxy address
        address payable proxy = payable(ProxyRegistry(proxyRegistry).proxies(dst));
        // Checks if the proxy address already existed and dst address is still the owner
        if (proxy == address(0) || DSProxy(proxy).owner() != dst) {
            uint csize;
            assembly {
                csize := extcodesize(dst)
            }
            // We want to avoid creating a proxy for a contract address that might not be able to handle proxies, then losing the CDP
            require(csize == 0, "Dst-is-a-contract");
            // Creates the proxy for the dst address
            proxy = ProxyRegistry(proxyRegistry).build(dst);
        }
        // Transfers CDP to the dst proxy
        give(manager, cdp, proxy);
    }

    function cdpAllow(
        address manager,
        uint cdp,
        address usr,
        uint ok
    ) public {
        DssCdpManager(manager).cdpAllow(cdp, usr, ok);
    }

    function urnAllow(
        address manager,
        address usr,
        uint ok
    ) public {
        DssCdpManager(manager).urnAllow(usr, ok);
    }

    function flux(
        address manager,
        uint cdp,
        address dst,
        uint wad
    ) public {
        DssCdpManager(manager).flux(cdp, dst, wad);
    }

    function move(
        address manager,
        uint cdp,
        address dst,
        uint rad
    ) public {
        DssCdpManager(manager).move(cdp, dst, rad);
    }

    function frob(
        address manager,
        uint cdp,
        int dink,
        int dart
    ) public {
        DssCdpManager(manager).frob(cdp, dink, dart);
    }

    function quit(
        address manager,
        uint cdp,
        address dst
    ) public {
        DssCdpManager(manager).quit(cdp, dst);
    }

    function enter(
        address manager,
        address src,
        uint cdp
    ) public {
        DssCdpManager(manager).enter(src, cdp);
    }

    function shift(
        address manager,
        uint cdpSrc,
        uint cdpOrg
    ) public {
        DssCdpManager(manager).shift(cdpSrc, cdpOrg);
    }
/*
    function makeGemBag(
        address gemJoin
    ) public returns (address bag) {
        bag = GemJoin4(gemJoin).make(address(this));
    }

    function lockETH(
        address manager,
        address ethJoin,
        uint cdp
    ) public payable {
        // Receives ETH amount, converts it to WETH and joins it into the vat
        ethJoin_join(ethJoin, address(this));
        // Locks WETH amount into the CDP
        Vat(DssCdpManager(manager).vat()).frob(
            DssCdpManager(manager).ilks(cdp),
            DssCdpManager(manager).urns(cdp),
            address(this),
            address(this),
            toInt(msg.value),
            0
        );
    }

    function safeLockETH(
        address manager,
        address ethJoin,
        uint cdp,
        address owner
    ) public payable {
        require(DssCdpManager(manager).owns(cdp) == owner, "owner-missmatch");
        lockETH(manager, ethJoin, cdp);
    }
*/
    function lockGem(
        address manager,
        address gemJoin,
        uint cdp,
        uint amt,
        bool transferFrom,
        address res
    ) public {
        // Takes token amount from user's wallet and joins into the vat
        gemJoin_join(gemJoin, address(this), amt, transferFrom, res);
        // Locks token amount into the CDP
        Vat(DssCdpManager(manager).vat()).frob(
            DssCdpManager(manager).ilks(cdp),
            DssCdpManager(manager).urns(cdp),
            address(this),
            address(this),
            toInt(convertTo18(gemJoin, amt)),
            0
        );
    }

    function safeLockGem(
        address manager,
        address gemJoin,
        uint cdp,
        uint amt,
        bool transferFrom,
        address owner,
        address res
    ) public {
        require(DssCdpManager(manager).owns(cdp) == owner, "owner-missmatch");
        lockGem(manager, gemJoin, cdp, amt, transferFrom, res);
    }
/*
    function freeETH(
        address manager,
        address ethJoin,
        uint cdp,
        uint wad
    ) public {
        // Unlocks WETH amount from the CDP
        frob(manager, cdp, -toInt(wad), 0);
        // Moves the amount from the CDP urn to proxy's address
        flux(manager, cdp, address(this), wad);
        // Exits WETH amount to proxy address as a token
        GemJoin(ethJoin).exit(address(this), wad);
        // Converts WETH to ETH
        WETH9_(payable(address(GemJoin(ethJoin).gem()))).withdraw(wad);
        // Sends ETH back to the user's wallet
        msg.sender.transfer(wad);
    }
*/
    function freeGem(
        address manager,
        address gemJoin,
        uint cdp,
        uint amt,
        address res
    ) public {
        uint wad = convertTo18(gemJoin, amt);
        // Unlocks token amount from the CDP
        frob(manager, cdp, -toInt(wad), 0);
        // Moves the amount from the CDP urn to proxy's address
        flux(manager, cdp, address(this), wad);
        // Exits token amount to the user's wallet as a token
        if (res == address(0)) {
            GemJoin(gemJoin).exit(msg.sender, amt);
        } else {
            GemJoin(gemJoin).exit(address(this), amt);
            DSVault(address(GemJoin(gemJoin).gem())).withdraw(amt, 1, true);
            DSToken(res).transfer(msg.sender, DSToken(res).balanceOf(address(this)));
        }
    }
/*
    function exitETH(
        address manager,
        address ethJoin,
        uint cdp,
        uint wad
    ) public {
        // Moves the amount from the CDP urn to proxy's address
        flux(manager, cdp, address(this), wad);

        // Exits WETH amount to proxy address as a token
        GemJoin(ethJoin).exit(address(this), wad);
        // Converts WETH to ETH
        WETH9_(payable(address(GemJoin(ethJoin).gem()))).withdraw(wad);
        // Sends ETH back to the user's wallet
        msg.sender.transfer(wad);
    }
*/
    function exitGem(
        address manager,
        address gemJoin,
        uint cdp,
        uint amt,
        address res
    ) public {
        // Moves the amount from the CDP urn to proxy's address
        flux(manager, cdp, address(this), convertTo18(gemJoin, amt));

        // Exits token amount to the user's wallet as a token
        if (res == address(0)) {
            GemJoin(gemJoin).exit(msg.sender, amt);
        } else {
            GemJoin(gemJoin).exit(address(this), amt);
            DSVault(address(GemJoin(gemJoin).gem())).withdraw(amt, 1, true);
            DSToken(res).transfer(msg.sender, DSToken(res).balanceOf(address(this)));
        }
    }

    function draw(
        address manager,
        address jug,
        address daiJoin,
        uint cdp,
        uint wad
    ) public {
        address urn = DssCdpManager(manager).urns(cdp);
        address vat = DssCdpManager(manager).vat();
        bytes32 ilk = DssCdpManager(manager).ilks(cdp);
        // Generates debt in the CDP
        frob(manager, cdp, 0, _getDrawDart(vat, jug, urn, ilk, wad));
        // Moves the DAI amount (balance in the vat in rad) to proxy's address
        move(manager, cdp, address(this), toRad(wad));
        // Allows adapter to access to proxy's DAI balance in the vat
        if (Vat(vat).can(address(this), address(daiJoin)) == 0) {
            Vat(vat).hope(daiJoin);
        }
        // Exits DAI to the user's wallet as a token
        DaiJoin(daiJoin).exit(msg.sender, wad);
    }

    function wipe(
        address manager,
        address daiJoin,
        uint cdp,
        uint wad
    ) public {
        address vat = DssCdpManager(manager).vat();
        address urn = DssCdpManager(manager).urns(cdp);
        bytes32 ilk = DssCdpManager(manager).ilks(cdp);

        address own = DssCdpManager(manager).owns(cdp);
        if (own == address(this) || DssCdpManager(manager).cdpCan(own, cdp, address(this)) == 1) {
            // Joins DAI amount into the vat
            daiJoin_join(daiJoin, urn, wad);
            // Paybacks debt to the CDP
            frob(manager, cdp, 0, _getWipeDart(vat, Vat(vat).dai(urn), urn, ilk));
        } else {
             // Joins DAI amount into the vat
            daiJoin_join(daiJoin, address(this), wad);
            // Paybacks debt to the CDP
            Vat(vat).frob(
                ilk,
                urn,
                address(this),
                address(this),
                0,
                _getWipeDart(vat, wad * RAY, urn, ilk)
            );
        }
    }

    function safeWipe(
        address manager,
        address daiJoin,
        uint cdp,
        uint wad,
        address owner
    ) public {
        require(DssCdpManager(manager).owns(cdp) == owner, "owner-missmatch");
        wipe(manager, daiJoin, cdp, wad);
    }

    function wipeAll(
        address manager,
        address daiJoin,
        uint cdp
    ) public {
        address vat = DssCdpManager(manager).vat();
        address urn = DssCdpManager(manager).urns(cdp);
        bytes32 ilk = DssCdpManager(manager).ilks(cdp);
        (, uint art) = Vat(vat).urns(ilk, urn);

        address own = DssCdpManager(manager).owns(cdp);
        if (own == address(this) || DssCdpManager(manager).cdpCan(own, cdp, address(this)) == 1) {
            // Joins DAI amount into the vat
            daiJoin_join(daiJoin, urn, _getWipeAllWad(vat, urn, urn, ilk));
            // Paybacks debt to the CDP
            frob(manager, cdp, 0, -int(art));
        } else {
            // Joins DAI amount into the vat
            daiJoin_join(daiJoin, address(this), _getWipeAllWad(vat, address(this), urn, ilk));
            // Paybacks debt to the CDP
            Vat(vat).frob(
                ilk,
                urn,
                address(this),
                address(this),
                0,
                -int(art)
            );
        }
    }

    function safeWipeAll(
        address manager,
        address daiJoin,
        uint cdp,
        address owner
    ) public {
        require(DssCdpManager(manager).owns(cdp) == owner, "owner-missmatch");
        wipeAll(manager, daiJoin, cdp);
    }

/*
    function lockETHAndDraw(
        address manager,
        address jug,
        address ethJoin,
        address daiJoin,
        uint cdp,
        uint wadD
    ) public payable {
        address urn = DssCdpManager(manager).urns(cdp);
        address vat = DssCdpManager(manager).vat();
        bytes32 ilk = DssCdpManager(manager).ilks(cdp);
        // Receives ETH amount, converts it to WETH and joins it into the vat
        ethJoin_join(ethJoin, urn);
        // Locks WETH amount into the CDP and generates debt
        frob(manager, cdp, toInt(msg.value), _getDrawDart(vat, jug, urn, ilk, wadD));
        // Moves the DAI amount (balance in the vat in rad) to proxy's address
        move(manager, cdp, address(this), toRad(wadD));
        // Allows adapter to access to proxy's DAI balance in the vat
        if (Vat(vat).can(address(this), address(daiJoin)) == 0) {
            Vat(vat).hope(daiJoin);
        }
        // Exits DAI to the user's wallet as a token
        DaiJoin(daiJoin).exit(msg.sender, wadD);
    }

    function openLockETHAndDraw(
        address manager,
        address jug,
        address ethJoin,
        address daiJoin,
        bytes32 ilk,
        uint wadD
    ) public payable returns (uint cdp) {
        cdp = open(manager, ilk, address(this));
        lockETHAndDraw(manager, jug, ethJoin, daiJoin, cdp, wadD);
    }
*/
    function lockGemAndDraw(
        address manager,
        address jug,
        address gemJoin,
        address daiJoin,
        uint cdp,
        uint amtC,
        uint wadD,
        bool transferFrom,
        address res
    ) public {
        address urn = DssCdpManager(manager).urns(cdp);
        address vat = DssCdpManager(manager).vat();
        bytes32 ilk = DssCdpManager(manager).ilks(cdp);
        // Takes token amount from user's wallet and joins into the vat
        gemJoin_join(gemJoin, urn, amtC, transferFrom, res);
        // Locks token amount into the CDP and generates debt
        int dart = _getDrawDart(vat, jug, urn, ilk, wadD);
        frob(manager, cdp, toInt(convertTo18(gemJoin, amtC)), dart);
        // Moves the DAI amount (balance in the vat in rad) to proxy's address
        move(manager, cdp, address(this), toRad(wadD));
        // Allows adapter to access to proxy's DAI balance in the vat
        if (Vat(vat).can(address(this), address(daiJoin)) == 0) {
            Vat(vat).hope(daiJoin);
        }
        // Exits DAI to the user's wallet as a token
        DaiJoin(daiJoin).exit(msg.sender, wadD);
    }

    function openLockGemAndDraw(
        address manager,
        address jug,
        address gemJoin,
        address daiJoin,
        bytes32 ilk,
        uint amtC,
        uint wadD,
        bool transferFrom,
        address res
    ) public returns (uint cdp) {
        cdp = open(manager, ilk, address(this));
        lockGemAndDraw(manager, jug, gemJoin, daiJoin, cdp, amtC, wadD, transferFrom, res);
    }
/*
    function openLockGNTAndDraw(
        address manager,
        address jug,
        address gntJoin,
        address daiJoin,
        bytes32 ilk,
        uint amtC,
        uint wadD
    ) public returns (address bag, uint cdp) {
        // Creates bag (if doesn't exist) to hold GNT
        bag = GemJoin4(gntJoin).bags(address(this));
        if (bag == address(0)) {
            bag = makeGemBag(gntJoin);
        }
        // Transfer funds to the funds which previously were sent to the proxy
        GemJoin(gntJoin).gem().transfer(bag, amtC);
        cdp = openLockGemAndDraw(manager, jug, gntJoin, daiJoin, ilk, amtC, wadD, false, address(0));
    }

    function wipeAndFreeETH(
        address manager,
        address ethJoin,
        address daiJoin,
        uint cdp,
        uint wadC,
        uint wadD
    ) public {
        address urn = DssCdpManager(manager).urns(cdp);
        // Joins DAI amount into the vat
        daiJoin_join(daiJoin, urn, wadD);
        // Paybacks debt to the CDP and unlocks WETH amount from it
        frob(
            manager,
            cdp,
            -toInt(wadC),
            _getWipeDart(DssCdpManager(manager).vat(), Vat(DssCdpManager(manager).vat()).dai(urn), urn, DssCdpManager(manager).ilks(cdp))
        );
        // Moves the amount from the CDP urn to proxy's address
        flux(manager, cdp, address(this), wadC);
        // Exits WETH amount to proxy address as a token
        GemJoin(ethJoin).exit(address(this), wadC);
        // Converts WETH to ETH
        WETH9_(payable(address(GemJoin(ethJoin).gem()))).withdraw(wadC);
        // Sends ETH back to the user's wallet
        msg.sender.transfer(wadC);
    }

    function wipeAllAndFreeETH(
        address manager,
        address ethJoin,
        address daiJoin,
        uint cdp,
        uint wadC
    ) public {
        address vat = DssCdpManager(manager).vat();
        address urn = DssCdpManager(manager).urns(cdp);
        bytes32 ilk = DssCdpManager(manager).ilks(cdp);
        (, uint art) = Vat(vat).urns(ilk, urn);

        // Joins DAI amount into the vat
        daiJoin_join(daiJoin, urn, _getWipeAllWad(vat, urn, urn, ilk));
        // Paybacks debt to the CDP and unlocks WETH amount from it
        frob(
            manager,
            cdp,
            -toInt(wadC),
            -int(art)
        );
        // Moves the amount from the CDP urn to proxy's address
        flux(manager, cdp, address(this), wadC);
        // Exits WETH amount to proxy address as a token
        GemJoin(ethJoin).exit(address(this), wadC);
        // Converts WETH to ETH
        WETH9_(payable(address(GemJoin(ethJoin).gem()))).withdraw(wadC);
        // Sends ETH back to the user's wallet
        msg.sender.transfer(wadC);
    }
*/
    function wipeAndFreeGem(
        address manager,
        address gemJoin,
        address daiJoin,
        uint cdp,
        uint amtC,
        uint wadD,
        address res
    ) public {
        address urn = DssCdpManager(manager).urns(cdp);
        bytes32 ilk = DssCdpManager(manager).ilks(cdp);
        // Joins DAI amount into the vat
        daiJoin_join(daiJoin, urn, wadD);
        uint wadC = convertTo18(gemJoin, amtC);
        // Paybacks debt to the CDP and unlocks token amount from it
        frob(
            manager,
            cdp,
            -toInt(wadC),
            _getWipeDart(DssCdpManager(manager).vat(), Vat(DssCdpManager(manager).vat()).dai(urn), urn, ilk)
        );
        // Moves the amount from the CDP urn to proxy's address
        flux(manager, cdp, address(this), wadC);
        // Exits token amount to the user's wallet as a token
        if (res == address(0)) {
            GemJoin(gemJoin).exit(msg.sender, amtC);
        } else {
            GemJoin(gemJoin).exit(address(this), amtC);
            DSVault(address(GemJoin(gemJoin).gem())).withdraw(amtC, 1, true);
            DSToken(res).transfer(msg.sender, DSToken(res).balanceOf(address(this)));
        }
    }

    function wipeAllAndFreeGem(
        address manager,
        address gemJoin,
        address daiJoin,
        uint cdp,
        uint amtC,
        address res
    ) public {
        address vat = DssCdpManager(manager).vat();
        address urn = DssCdpManager(manager).urns(cdp);
        bytes32 ilk = DssCdpManager(manager).ilks(cdp);
        (, uint art) = Vat(vat).urns(ilk, urn);

        // Joins DAI amount into the vat
        daiJoin_join(daiJoin, urn, _getWipeAllWad(vat, urn, urn, ilk));
        uint wadC = convertTo18(gemJoin, amtC);
        // Paybacks debt to the CDP and unlocks token amount from it
        frob(
            manager,
            cdp,
            -toInt(wadC),
            -int(art)
        );
        // Moves the amount from the CDP urn to proxy's address
        flux(manager, cdp, address(this), wadC);
        // Exits token amount to the user's wallet as a token
        if (res == address(0)) {
            GemJoin(gemJoin).exit(msg.sender, amtC);
        } else {
            GemJoin(gemJoin).exit(address(this), amtC);
            DSVault(address(GemJoin(gemJoin).gem())).withdraw(amtC, 1, true);
            DSToken(res).transfer(msg.sender, DSToken(res).balanceOf(address(this)));
        }
    }
}

contract DssProxyActionsEnd is Common {
    // Internal functions

    function _free(
        address manager,
        address end,
        uint cdp
    ) internal returns (uint ink) {
        bytes32 ilk = DssCdpManager(manager).ilks(cdp);
        address urn = DssCdpManager(manager).urns(cdp);
        Vat vat = Vat(DssCdpManager(manager).vat());
        uint art;
        (ink, art) = vat.urns(ilk, urn);

        // If CDP still has debt, it needs to be paid
        if (art > 0) {
            End(end).skim(ilk, urn);
            (ink,) = vat.urns(ilk, urn);
        }
        // Approves the manager to transfer the position to proxy's address in the vat
        if (vat.can(address(this), address(manager)) == 0) {
            vat.hope(manager);
        }
        // Transfers position from CDP to the proxy address
        DssCdpManager(manager).quit(cdp, address(this));
        // Frees the position and recovers the collateral in the vat registry
        End(end).free(ilk);
    }
/*
    // Public functions
    function freeETH(
        address manager,
        address ethJoin,
        address end,
        uint cdp
    ) public {
        uint wad = _free(manager, end, cdp);
        // Exits WETH amount to proxy address as a token
        GemJoin(ethJoin).exit(address(this), wad);
        // Converts WETH to ETH
        WETH9_(payable(address(GemJoin(ethJoin).gem()))).withdraw(wad);
        // Sends ETH back to the user's wallet
        msg.sender.transfer(wad);
    }
*/
    function freeGem(
        address manager,
        address gemJoin,
        address end,
        uint cdp,
        address res
    ) public {
        uint amt = _free(manager, end, cdp) / 10 ** (18 - GemJoin(gemJoin).dec());
        // Exits token amount to the user's wallet as a token
        if (res == address(0)) {
            GemJoin(gemJoin).exit(msg.sender, amt);
        } else {
            GemJoin(gemJoin).exit(address(this), amt);
            DSVault(address(GemJoin(gemJoin).gem())).withdraw(amt, 1, true);
            DSToken(res).transfer(msg.sender, DSToken(res).balanceOf(address(this)));
        }
    }

    function pack(
        address daiJoin,
        address end,
        uint wad
    ) public {
        daiJoin_join(daiJoin, address(this), wad);
        Vat vat = DaiJoin(daiJoin).vat();
        // Approves the end to take out DAI from the proxy's balance in the vat
        if (vat.can(address(this), address(end)) == 0) {
            vat.hope(end);
        }
        End(end).pack(wad);
    }
/*
    function cashETH(
        address ethJoin,
        address end,
        bytes32 ilk,
        uint wad
    ) public {
        End(end).cash(ilk, wad);
        uint wadC = _mul(wad, End(end).fix(ilk)) / RAY;
        // Exits WETH amount to proxy address as a token
        GemJoin(ethJoin).exit(address(this), wadC);
        // Converts WETH to ETH
        WETH9_(payable(address(GemJoin(ethJoin).gem()))).withdraw(wadC);
        // Sends ETH back to the user's wallet
        msg.sender.transfer(wadC);
    }
*/
    function cashGem(
        address gemJoin,
        address end,
        bytes32 ilk,
        uint wad,
        address res
    ) public {
        End(end).cash(ilk, wad);
        // Exits token amount to the user's wallet as a token
        uint amt = _mul(wad, End(end).fix(ilk)) / RAY / 10 ** (18 - GemJoin(gemJoin).dec());
        if (res == address(0)) {
            GemJoin(gemJoin).exit(msg.sender, amt);
        } else {
            GemJoin(gemJoin).exit(address(this), amt);
            DSVault(address(GemJoin(gemJoin).gem())).withdraw(amt, 1, true);
            DSToken(res).transfer(msg.sender, DSToken(res).balanceOf(address(this)));
        }
    }
}

contract DssProxyActionsDsr is Common {
    function join(
        address daiJoin,
        address pot,
        uint wad
    ) public {
        Vat vat = DaiJoin(daiJoin).vat();
        // Executes drip to get the chi rate updated to rho == now, otherwise join will fail
        uint chi = Pot(pot).drip();
        // Joins wad amount to the vat balance
        daiJoin_join(daiJoin, address(this), wad);
        // Approves the pot to take out DAI from the proxy's balance in the vat
        if (vat.can(address(this), address(pot)) == 0) {
            vat.hope(pot);
        }
        // Joins the pie value (equivalent to the DAI wad amount) in the pot
        Pot(pot).join(_mul(wad, RAY) / chi);
    }

    function exit(
        address daiJoin,
        address pot,
        uint wad
    ) public {
        Vat vat = DaiJoin(daiJoin).vat();
        // Executes drip to count the savings accumulated until this moment
        uint chi = Pot(pot).drip();
        // Calculates the pie value in the pot equivalent to the DAI wad amount
        uint pie = _mul(wad, RAY) / chi;
        // Exits DAI from the pot
        Pot(pot).exit(pie);
        // Checks the actual balance of DAI in the vat after the pot exit
        uint bal = DaiJoin(daiJoin).vat().dai(address(this));
        // Allows adapter to access to proxy's DAI balance in the vat
        if (vat.can(address(this), address(daiJoin)) == 0) {
            vat.hope(daiJoin);
        }
        // It is necessary to check if due rounding the exact wad amount can be exited by the adapter.
        // Otherwise it will do the maximum DAI balance in the vat
        DaiJoin(daiJoin).exit(
            msg.sender,
            bal >= _mul(wad, RAY) ? wad : bal / RAY
        );
    }

    function exitAll(
        address daiJoin,
        address pot
    ) public {
        Vat vat = DaiJoin(daiJoin).vat();
        // Executes drip to count the savings accumulated until this moment
        uint chi = Pot(pot).drip();
        // Gets the total pie belonging to the proxy address
        uint pie = Pot(pot).pie(address(this));
        // Exits DAI from the pot
        Pot(pot).exit(pie);
        // Allows adapter to access to proxy's DAI balance in the vat
        if (vat.can(address(this), address(daiJoin)) == 0) {
            vat.hope(daiJoin);
        }
        // Exits the DAI amount corresponding to the value of pie
        DaiJoin(daiJoin).exit(msg.sender, _mul(chi, pie) / RAY);
    }
}
