/*
 * SPDX-License-Identifier: Apache-2.0
 */

 // tslint:disable: no-unused-expression
import { Context } from 'fabric-contract-api';
import { ChaincodeStub, ClientIdentity } from 'fabric-shim';
import { MyPrivateAssetContract } from '.';

import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import winston = require('winston');

chai.should();
chai.use(chaiAsPromised);
chai.use(sinonChai);

class TestContext implements Context {
    public stub: sinon.SinonStubbedInstance<ChaincodeStub> = sinon.createStubInstance(ChaincodeStub);
    public clientIdentity: sinon.SinonStubbedInstance<ClientIdentity> = sinon.createStubInstance(ClientIdentity);
    public logging = {
        getLogger: sinon.stub().returns(sinon.createStubInstance(winston.createLogger().constructor)),
        setLevel: sinon.stub(),
    };
}

describe('MyPrivateAssetContract', () => {

    let contract: MyPrivateAssetContract;
    let ctx: TestContext;
    const myCollection: string = 'myCollection';

    beforeEach(() => {
        contract = new MyPrivateAssetContract();
        ctx = new TestContext();
        ctx.stub.getPrivateData.withArgs(myCollection, '001').resolves(Buffer.from('{"privateValue":"150"}'));
    });

    describe('#myPrivateAssetExists', () => {

        it('should return true for a private asset that exists', async () => {
            await contract.myPrivateAssetExists(ctx, '001').should.eventually.be.true;
        });

        it('should return false for a private asset that does not exist', async () => {
            await contract.myPrivateAssetExists(ctx, '002').should.eventually.be.false;
        });

    });

    describe('#createMyPrivateAsset', () => {

        it('should throw an error for a private asset that already exists', async () => {
            await contract.createMyPrivateAsset(ctx, '001').should.be.rejectedWith(`The private asset 001 already exists`);
        });

        it('should throw an error if transient data is not provided when creating private asset', async () => {
            ctx.stub.getTransient.resolves(undefined);
            await contract.createMyPrivateAsset(ctx, '002').should.be.rejectedWith(`Transient data not supplied. Please try again.`);
        });

        it('should create a private asset if transient data key is privateValue', async () => {
            const transientMap = new Map<string, Buffer>();
            transientMap.set('privateValue', Buffer.from('1500'));
            ctx.stub.getTransient.resolves(transientMap);
            await contract.createMyPrivateAsset(ctx, '002');
            ctx.stub.putPrivateData.should.have.been.calledOnceWithExactly(myCollection, '002', Buffer.from('{"privateValue":"1500"}'));
        });

        it('should create a private asset without the privateValue attribute if incorrect transient data provided', async () => {
            const transientMap = new Map<string, Buffer>();
            transientMap.set('', Buffer.from(''));
            ctx.stub.getTransient.resolves(transientMap);
            await contract.createMyPrivateAsset(ctx, '002');
            ctx.stub.putPrivateData.should.have.been.calledOnceWithExactly(myCollection, '002', Buffer.from('{}'));
        });

    });

    describe('#readMyPrivateAsset', () => {

        it('should throw an error for my private asset that does not exist', async () => {
            await contract.readMyPrivateAsset(ctx, '003').should.be.rejectedWith('The private asset 003 does not exist');
        });

        it('should return my private asset', async () => {
            await contract.readMyPrivateAsset(ctx, '001').should.eventually.deep.equal({ privateValue: '150' });
            ctx.stub.getPrivateData.should.have.been.calledWithExactly(myCollection, '001');
        });

    });

    describe('#updateMyPrivateAsset', () => {

        it('should throw an error for my private asset that does not exist', async () => {
            await contract.updateMyPrivateAsset(ctx, '003').should.be.rejectedWith(`The private asset 003 does not exist`);
        });

        it('should throw an error if transient data is not provided when updating private asset', async () => {
            ctx.stub.getTransient.resolves(undefined);
            await contract.updateMyPrivateAsset(ctx, '001').should.be.rejectedWith(`Transient data not supplied. Please try again.`);
        });

        it('should update my private asset', async () => {
            const transientMap = new Map<string, Buffer>();
            transientMap.set('privateValue', Buffer.from('99'));
            ctx.stub.getTransient.resolves(transientMap);
            await contract.updateMyPrivateAsset(ctx, '001');
            ctx.stub.putPrivateData.should.have.been.calledOnceWithExactly(myCollection, '001', Buffer.from('{"privateValue":"99"}'));
        });

        it('should update a private asset so it doesnt have the privateValue attribute if incorrect transient data provided', async () => {
            const transientMap = new Map<string, Buffer>();
            transientMap.set('', Buffer.from(''));
            ctx.stub.getTransient.resolves(transientMap);
            await contract.updateMyPrivateAsset(ctx, '001');
            ctx.stub.putPrivateData.should.have.been.calledOnceWithExactly(myCollection, '001', Buffer.from('{}'));
        });

    });

    describe('#deleteMyPrivateAsset', () => {

        it('should throw an error for my private asset that does not exist', async () => {
            await contract.deleteMyPrivateAsset(ctx, '003').should.be.rejectedWith('The private asset 003 does not exist');
        });

        it('should delete my private asset', async () => {
            await contract.deleteMyPrivateAsset(ctx, '001');
            ctx.stub.deletePrivateData.should.have.been.calledOnceWithExactly(myCollection, '001');
        });

    });

    describe('#verifyMyPrivateAsset', () => {

        it('should return success message if hash provided matches the hash of the private data', async () => {
            ctx.stub.getPrivateDataHash.resolves(Buffer.from('xyz'));
            ctx.stub.getPrivateData.withArgs(myCollection, '001').resolves(Buffer.from('{"privateValue":"150"}'));
            const result = await contract.verifyMyPrivateAsset(ctx, myCollection, '001', '78797a'); // 78797a is the hash value of xyz
            result.should.equal('\nCalculated Hash provided: \n78797a\n\n             MATCHES  <----->  \n\nHash from Private Data Hash State \n78797a');
        });

        it('should throw an error if hash provided does not match the hash of the private data', async () => {
            ctx.stub.getPrivateDataHash.resolves(Buffer.from('xyz'));
            ctx.stub.getPrivateData.withArgs(myCollection, '001').resolves(Buffer.from('{"privateValue":"150"}'));
            await contract.verifyMyPrivateAsset(ctx, myCollection, '001', 'xyz').should.be.rejectedWith('Could not match the Private Data Hash State');
        });

        it('should throw an error when user tries to verify an asset that doesnt exist', async () => {
            ctx.stub.getPrivateDataHash.resolves(Buffer.from(''));
            ctx.stub.getPrivateData.withArgs('someCollection', '001').resolves(Buffer.from('{"penguin":"150"}'));
            await contract.verifyMyPrivateAsset(ctx, 'someCollection', '001', '78797a').should.be.rejectedWith('No private data hash with that Key: 001');
        });

    });

});
