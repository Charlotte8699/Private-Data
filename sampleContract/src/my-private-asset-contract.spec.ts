/*
 * SPDX-License-Identifier: Apache-2.0
 */

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

    describe('#MyPrivateAssetExists', () => {

        it('should return true for an existing private asset', async () => {
            await contract.myPrivateAssetExists(ctx, '001').should.eventually.be.true;
        });

        it('should return false for a private asset that does not exist', async () => {
            await contract.myPrivateAssetExists(ctx, '002').should.eventually.be.false;
        });

    });

    describe('#createMyPrivateAsset', () => {

        it('should create a private asset', async () => {
            ctx.stub.getTransient.resolves(['privateValue', Buffer.from('1500')]);
            await contract.createMyPrivateAsset(ctx, '002');
            ctx.stub.putPrivateData.should.have.been.calledOnceWithExactly(myCollection, '002', Buffer.from('{"privateValue":"1500"}'));
        });

        it('should throw an error if transient data is not provided when creating private asset', async () => {
            ctx.stub.getTransient.resolves(undefined);
            await contract.createMyPrivateAsset(ctx, '002').should.be.rejectedWith(`Transient data not supplied Please try again.`);
        });

        it('should throw an error for a private asset that already exists', async () => {
            await contract.createMyPrivateAsset(ctx, '001').should.be.rejectedWith(`The my asset 001 already exists`);
        });

    });

    describe('#readMyPrivateAsset', () => {

        it('should return my private asset', async () => {
            await contract.readMyPrivateAsset(ctx, '001').should.eventually.deep.equal({ privateValue: '150' });
            ctx.stub.getPrivateData.should.have.been.calledWithExactly(myCollection, '001');
        });

        it('should throw an error for my private asset that does not exist', async () => {
            await contract.readMyPrivateAsset(ctx, '003').should.be.rejectedWith('The my asset 003 does not exist');
        });

    });

    describe('#updateMyPrivateAsset', () => {

        it('should update my private asset', async () => {
            ctx.stub.getTransient.resolves(['privateValue', Buffer.from('99')]);
            await contract.updateMyPrivateAsset(ctx, '001');
            ctx.stub.putPrivateData.should.have.been.calledOnceWithExactly(myCollection, '001', Buffer.from('{"privateValue":"99"}'));
        });

        it('should throw an error if transient data is not provided when updating private asset', async () => {
            ctx.stub.getTransient.resolves(undefined);
            await contract.createMyPrivateAsset(ctx, '002').should.be.rejectedWith(`Transient data not supplied. Please try again.`);
        });

        it('should throw an error for my private asset that does not exist', async () => {
            await contract.updateMyPrivateAsset(ctx, '003').should.be.rejectedWith(`The my asset 003 does not exist`);
        });

    });

    describe('#deleteMyPrivateAsset', () => {

        it('should delete my private asset', async () => {
            await contract.deleteMyPrivateAsset(ctx, '001');
            ctx.stub.deletePrivateData.should.have.been.calledOnceWithExactly(myCollection, '001');
        });

        it('should throw an error for my private asset that does not exist', async () => {
            await contract.deleteMyPrivateAsset(ctx, '1003').should.be.rejectedWith('The my asset 1003 does not exist');
        });

    });

    describe('#verifyMyPrivateAsset', () => {

        // it('should verify my private asset', async () => {
        //     return;
        // });

        it('should error if an org which doesnt have permission tries to verify private asset', async () => {
            // How do you stub clientIdentity to ensure the MSPID is what you want it to be?
            await contract.verifyMyPrivateAsset(ctx, myCollection, '001', 'xyz').should.be.rejectedWith('Only the regulator can verify the asset.');
            // tslint:disable-next-line: no-unused-expression
            ctx.stub.getPrivateDataHash.should.not.have.been.called;

        });

        // it('should error if no hash for that asset key', async () => {

        // });
    });

});
