#!/bin/bash

source .env

CHAIN_ID=56
GAS_LIMIT=60000000
FORK_URL='wss://bsc-ws-node.nariox.org:443'
#FORK_URL='https://bsc-dataseed.binance.org/'
#FORK_URL='https://apis.ankr.com/'$ANKR_APIKEY_BSCMAIN'/'$ANKR_PROJECT_ID'/binance/full/main'

BALANCE=100000000000000000000000

npx ganache-cli \
	-q \
	-h 0.0.0.0 \
	-i $CHAIN_ID \
	--chainId $CHAIN_ID \
	-l $GAS_LIMIT \
	-f $FORK_URL \
	--account $PRIVATE_KEY,$BALANCE
