#!/bin/bash

source .env

CHAIN_ID=80001
GAS_LIMIT=20000000
#FORK_URL='https://rpc-mumbai.maticvigil.com/'
FORK_URL='https://polygon-mumbai.infura.io/v3/'$INFURA_PROJECT_ID
#FORK_URL='https://apis.ankr.com/'$ANKR_APIKEY_MATICTEST'/'$ANKR_PROJECT_ID'/polygon/full/test'

BALANCE=100000000000000000000000

npx ganache-cli \
	-q \
	-h 0.0.0.0 \
	-i $CHAIN_ID \
	--chainId $CHAIN_ID \
	-l $GAS_LIMIT \
	-f $FORK_URL \
	--account $PRIVATE_KEY,$BALANCE
