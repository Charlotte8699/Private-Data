/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import { MyPrivateAsset } from './my-private-asset';
const myCollection: string = 'myCollection';

@Info({title: 'MyPrivateAssetContract', description: 'My Private Smart Contract' })
export class MyPrivateAssetContract extends Contract {

    @Transaction(false)
    @Returns('boolean')
    public async myPrivateAssetExists(ctx: Context, myPrivateAssetId: string): Promise<boolean> {
        const buffer = await ctx.stub.getPrivateData(myCollection, myPrivateAssetId);
        return (!!buffer && buffer.length > 0);
    }

    @Transaction()
    public async createMyPrivateAsset(ctx: Context, myPrivateAssetId: string): Promise<void> {
        const exists = await this.myPrivateAssetExists(ctx, myPrivateAssetId);
        if (exists) {
            throw new Error(`The private asset ${myPrivateAssetId} already exists`);
        }

        const privateAsset: any = new MyPrivateAsset();

        const transientData = await ctx.stub.getTransient();
        if (!transientData) {
            throw new Error(`Transient data not supplied. Please try again.`);
        }

        transientData.forEach((value, key) => {
            const dataValue: string = value.toString('utf8');
            if (key === 'privateValue') {
                privateAsset.privateValue = dataValue;
            }
        });

        await ctx.stub.putPrivateData(myCollection, myPrivateAssetId, Buffer.from(JSON.stringify(privateAsset)));
    }

    @Transaction(false)
    @Returns('myPrivateAsset')
    public async readMyPrivateAsset(ctx: Context, myPrivateAssetId: string): Promise<string> {
        const exists = await this.myPrivateAssetExists(ctx, myPrivateAssetId);
        if (!exists) {
            throw new Error(`The private asset ${myPrivateAssetId} does not exist`);
        }
        let privateDataString: string;
        const privateData: Buffer = await ctx.stub.getPrivateData(myCollection, myPrivateAssetId);
        privateDataString = JSON.parse(privateData.toString());
        return privateDataString;
    }

    @Transaction()
    public async updateMyPrivateAsset(ctx: Context, myPrivateAssetId: string): Promise<void> {
        const exists = await this.myPrivateAssetExists(ctx, myPrivateAssetId);
        if (!exists) {
            throw new Error(`The private asset ${myPrivateAssetId} does not exist`);
        }

        const privateAsset: any = new MyPrivateAsset();

        const transientData = await ctx.stub.getTransient();
        if (!transientData) {
            throw new Error(`Transient data not supplied. Please try again.`);
        }

        transientData.forEach((value, key) => {
            const dataValue: string = value.toString('utf8');
            if (key === 'privateValue') {
                privateAsset.privateValue = dataValue;
            }
        });

        await ctx.stub.putPrivateData(myCollection, myPrivateAssetId, Buffer.from(JSON.stringify(privateAsset)));
    }

    @Transaction()
    public async deleteMyPrivateAsset(ctx: Context, myPrivateAssetId: string): Promise<void> {
        const exists = await this.myPrivateAssetExists(ctx, myPrivateAssetId);
        if (!exists) {
            throw new Error(`The private asset ${myPrivateAssetId} does not exist`);
        }
        await ctx.stub.deletePrivateData(myCollection, myPrivateAssetId);
    }

    @Transaction(false)
    public async verifyMyPrivateAsset(ctx: Context, collection: string, myPrivateAssetId: string, hashToVerify: string): Promise<string> {

        const pdHashBytes: Buffer = await ctx.stub.getPrivateDataHash(collection, myPrivateAssetId);
        if (pdHashBytes.length === 0) {
            throw new Error('No private data hash with that Key: ' + myPrivateAssetId);
        }

        const actualHash: string = pdHashBytes.toString('hex');

        if (hashToVerify === actualHash) {
            return '\nCalculated Hash provided: \n' + hashToVerify + '\n\n             MATCHES  <----->  \n\nHash from Private Data Hash State \n' + actualHash;
        } else {
            throw new Error('Could not match the Private Data Hash State');
        }
    }

}
