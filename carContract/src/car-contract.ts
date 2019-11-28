/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import { Car } from './car';
const CollectionBuyer: string = 'CollectionBuyer';
const CollectionSeller: string = 'CollectionSeller';

@Info({title: 'CarContract', description: 'My Smart Contract' })
export class CarContract extends Contract {

    @Transaction()
    public async initLedger(ctx: Context): Promise<void> {
        console.info('======== START : Initialize Ledger ========');
        const cars: Car[] = [
            {
                color: 'blue',
                make: 'Arium',
                model: 'Thanos',
            },
            {
                color: 'green',
                make: 'Arium',
                model: 'Thanos',
            },
            {
                color: 'red',
                make: 'Arium',
                model: 'Thanos',
            },
        ];

        for (let i = 0; i < cars.length; i++) {
            cars[i].docType = 'car';
            await ctx.stub.putState('CAR' + i, Buffer.from(JSON.stringify(cars[i])));
            console.info('Added <--> ', cars[i]);
        }

        console.info('============ END: Initialize Ledger ===========');
    }

    @Transaction(false)
    @Returns('boolean')
    public async carExists(ctx: Context, carId: string): Promise<boolean> {
        const buffer: Buffer = await ctx.stub.getState(carId);
        return (!!buffer && buffer.length > 0);
    }

    @Transaction()
    @Returns('string')
    public async advertize(ctx: Context, contractId: string, seller: string, carId: string, advertizedPrice: number, advertizedDate: string): Promise<string> {
        // Create an advertisement

        const exists: boolean = await this.carExists(ctx, carId);
        if (!exists) {
            throw new Error(`The car ${carId} does not exist`);
        }

        // advertize cars in the public ledger
        const carTrade: any = {
            contractId,
            seller,
            carId,
            advertizedPrice,
            advertizedDate,
        };

        await ctx.stub.putState(carTrade.contractId, Buffer.from(JSON.stringify(carTrade)));

        return JSON.stringify(carTrade);
    }

    @Transaction()
    @Returns('string')
    public async offer(ctx: Context, contractId: string): Promise<string> {
        // initialize privateData object
        const privateData: any = {};

        // check whether transient data with buyer and offer price exists
        const transientData = ctx.stub.getTransient();
        if (transientData.size === 0) {
            return ('Error: Transient data not supplied. Try again.');
        }

        // get the transient data and put values into the privateData object
        transientData.forEach((value, key) => {
            const dataValue: string = value.toString('utf8');
            if (key === 'privateBuyer') {
                privateData[key] = dataValue;
            }
            if (key === 'privatePrice') {
                privateData[key] = parseInt(dataValue, 10);
            }
        });

        // put private data onto the private data collection
        console.log(privateData);
        await ctx.stub.putPrivateData(CollectionBuyer, contractId, Buffer.from(JSON.stringify(privateData)));

        // return transient data to the terminal
        return JSON.stringify(privateData);
    }

    @Transaction(false)
    @Returns('string')
    public async readOffer(ctx: Context, contractId: string): Promise<string> {
        let privateDataString: string;
        const privateData: Buffer = await ctx.stub.getPrivateData(CollectionBuyer, contractId);
        if (privateData.length > 0) {
            privateDataString = JSON.parse(privateData.toString());
            console.log('Private data retrieved from collection.');
            console.log(privateDataString);
        } else {
            console.log('No private data with the Key: ', contractId);
            return ('No private data with the Key: ' + contractId);
        }
        return privateDataString;
    }

    @Transaction()
    @Returns('string')
    public async accept(ctx: Context, contractId: string): Promise<string> {
        // initialize privateData object
        const privateData: any = {};

        // check whether transient data with buyer and offer price exists
        const transientData: any = ctx.stub.getTransient();
        if (transientData.size === 0) {
            return ('Error: Transient data not supplied. Try again.');
        }

        // get the transient data and put values into the privateData object
        transientData.forEach((value, key) => {
            const dataValue: string = value.toString('utf8');
            if (key === 'acceptPrice') {
                privateData[key] = parseInt(dataValue, 10);
            }
            if (key === 'privateBuyer') {
                privateData[key] = dataValue;
            }
            if (key === 'privatePrice') {
                privateData[key] = parseInt(dataValue, 10);
            }
        });

        // putPrivateData based on the collection definition for buyer organization and privateData object
        await ctx.stub.putPrivateData(CollectionSeller, contractId, Buffer.from(JSON.stringify(privateData)));

        // return transient data to the terminal
        return JSON.stringify(privateData);
    }

    @Transaction(false)
    @Returns('string')
    public async readAccept(ctx: Context, contractId: string): Promise<string> {
        let privateDataString: string;
        const privateData = await ctx.stub.getPrivateData(CollectionSeller, contractId);
        if (privateData.length > 0) {
            privateDataString = JSON.parse(privateData.toString());
            console.log('Private data retrieved from collection.');
            console.log(privateData);
        } else {
            console.log('No private data with the Key: ', contractId);
            return ('No private data with the Key: ' + contractId);
        }
        return privateDataString;
    }

    @Transaction(false) // evaluate transaction
    @Returns('string')
    public async verifyPrivateData(ctx: Context, collection: string, contractId: string, hashToVerify: string): Promise<string> {
        console.log('retrieving the hash from the PDC hash store of the buy transaction (fn: crossVerify)' + contractId);

        const pdHashBytes: Buffer = await ctx.stub.getPrivateDataHash(collection, contractId);

        if (pdHashBytes.length > 0) {
            // got hash from the hash store
            console.log('retrieved private data hash from collection');
        } else {
            // hash doesn't exist with the given key
            console.log('No private data hash with that Key: ', contractId);
            return 'No private data hash with that Key: ' + contractId;
        }

        //  retrieve SHA256 hash of the converted Byte array -> string from private data collection's hash store (DB)
        const actualHash: string = pdHashBytes.toString('hex');

        // Get the 'channel hash' written in the 'offer' function - from the world state
        const acceptBytes: Buffer = await ctx.stub.getState(contractId);
        if (acceptBytes.length > 0) {
            const verify: string = JSON.parse(acceptBytes.toString());
            console.log('retrieved contract (verifyPrivateData)');
            console.log(verify);
        } else {
            console.log('Nothing advertised with that Key: ', contractId);
            const verify: string = 'EMPTY CONTRACT (verifyPrivateData function)';
            return verify;
        }
        if (hashToVerify === actualHash) {
            // verify successful
            return '\nCalculated Hash provided: \n' + hashToVerify + '\n\n             MATCHES  <----->  \n\nHash from Private Data Hash State \n' + actualHash;
        } else {
            return 'Could not match the Private Data Hash State: ' + actualHash;
        }
    }

}
