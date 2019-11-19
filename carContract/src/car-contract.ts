/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import { Car } from './car';

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
        const buffer = await ctx.stub.getState(carId);
        return (!!buffer && buffer.length > 0);
    }

    @Transaction()
    @Returns('string')
    public async advertize(ctx: Context, advertizedDate: string, advertizedPrice: number, carId: string, contractId: string, seller: string): Promise<string> {
        // Create an advertisement

        const exists = await this.carExists(ctx, carId);
        if (!exists) {
            throw new Error(`The car ${carId} does not exist`);
        }

        // advertize cars in the public ledger
        const carTrade: any = {
            advertizedDate,
            advertizedPrice,
            carId,
            contractID: contractId,
            seller,
        };

        await ctx.stub.putState(contractId, Buffer.from(JSON.stringify(carTrade)));

        return JSON.stringify(carTrade);
    }

    @Transaction()
    @Returns('string')
    public async offer(ctx: Context, contractId: string): Promise<string> {
        // Offer goes here

        // initialize privateData object
        const privateData = {};

        // check whether transient data with buyer and offer price exists
        const transientData = ctx.stub.getTransient();
        if (transientData.size === 0) {
            return ('Error: Transient data not supplied. Try again.');
        }

        // get the transient data and put values into the privateData object
        transientData.forEach((value, key) => {
            const dataValue = new Buffer(value.buffer).toString();
            if (key === 'privateBuyer') {
                privateData[key] = dataValue;
            }
            if (key === 'privatePrice') {
                privateData[key] = parseInt(dataValue);
            }
        });

        // update state of public ledger

        // putPrivateData based on the collection definition for buyer organization and privateData object
        await ctx.stub.putPrivateData('CollectionBuyer', contractId, Buffer.from(JSON.stringify(privateData)));

        // return transient data to the terminal
        return JSON.stringify(privateData);
    }

    @Transaction(false)
    @Returns('string')
    public async readOffer(ctx: Context, contractId: string): Promise<string> {
        let privateDataString;
        const privateData = await ctx.stub.getPrivateData('CollectionSeller', contractId);
        if (privateData.length > 0) {
            privateDataString = JSON.stringify(privateData);
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
        const privateData = {};

        // check whether transient data with buyer and offer price exists
        const transientData = ctx.stub.getTransient();
        if (transientData.size === 0) {
            return ('Error: Transient data not supplied. Try again.');
        }

        // get the transient data and put values into the privateData object
        transientData.forEach((value, key) => {
            const dataValue = new Buffer(value.buffer).toString();
            if (key === 'acceptPrice') {
                privateData[key] = parseInt(dataValue);
            }
            if (key === 'privateBuyer') {
                privateData[key] = dataValue;
            }
            if (key === 'privatePrice') {
                privateData[key] = parseInt(dataValue);
            }
        });

        // update state of public ledger
        // putPrivateData based on the collection definition for buyer organization and privateData object
        await ctx.stub.putPrivateData('CollectionSeller', contractId, Buffer.from(JSON.stringify(privateData)));

        // return transient data to the terminal
        return JSON.stringify(privateData);
    }

    @Transaction(false)
    @Returns('string')
    public async readAccept(ctx: Context, contractId: string): Promise<string> {
        let privateDataString;
        const privateData = await ctx.stub.getPrivateData('CollectionBuyer', contractId);
        if (privateData.length > 0) {
            privateDataString = JSON.stringify(privateData);
            console.log('Private data retrieved from collection.');
            console.log(privateData);
        } else {
            console.log('No private data with the Key: ', contractId);
            return ('No private data with the Key: ' + contractId);
        }
        return privateDataString;
    }

}
