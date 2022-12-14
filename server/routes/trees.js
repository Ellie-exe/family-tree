import express from 'express'
const router = express.Router();

import { OAuth2Client } from 'google-auth-library';
const CLIENT_ID = '740022531730-l28oie7e785fi8n676q35a6nns70lec1.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);

import mongoose from 'mongoose'
await mongoose.connect('mongodb://127.0.0.1:27017/familyTreeDB');

import trees from '../modals/treeModal.js';
import users from '../modals/userModal.js';
import members from '../modals/memberModal.js';

router.get('/', async (req, res) => {
    const ticket = await client.verifyIdToken({
        idToken: req.headers['authorization'].split(' ')[1],
        audience: CLIENT_ID

    }).catch(() => { res.status(401) });
    if (res.statusCode === 401) return res.sendStatus(401);

    // const update = { expire: new Date() };
    // const options = { upsert: true, new: true, setDefaultsOnInsert: true };

    users.findOne({ email: ticket.getPayload().email }, async (err, user) => {
        if (err) return res.sendStatus(500);

        // if (!user) {
        //     await users.create({email: ticket.getPayload().email}, (err, newUser) => {
        //         if (err) return res.sendStatus(500);
        //         user = newUser;
        //     });
        // }

        const u = await user.populate({ path: 'trees', populate: [{ path: 'users' }, { path: 'members', populate: [{ path: 'fields' }, { path: 'children' }, { path: 'parents' }] }] });
        res.json({ 'trees': u.trees });
    });
});

router.get('/:_id', async (req, res) => {
    const ticket = await client.verifyIdToken({
        idToken: req.headers['authorization'].split(' ')[1],
        audience: CLIENT_ID

    }).catch(() => { res.status(401) });
    if (res.statusCode === 401) return res.sendStatus(401);

    users.findOne({ email: ticket.getPayload().email }, async (err, user) => {
        if (err) return res.status(500);

        const u = await user.populate({ path: 'trees', populate: [{ path: 'users' }, { path: 'members', populate: [{ path: 'fields' }, { path: 'children' }, { path: 'parents' }] }] });
        const tree = u.trees.find(tree => tree.id === req.params._id);
        res.json({ tree: tree });
    })
});

router.post('/', async (req, res) => {
    const ticket = await client.verifyIdToken({
        idToken: req.headers['authorization'].split(' ')[1],
        audience: CLIENT_ID

    }).catch(() => { res.status(401) });
    if (res.statusCode === 401) return res.sendStatus(401);

    await trees.create({ displayName: req.body.name}, async (err, tree) => {
        if (err) return res.sendStatus(500);

        users.findOne({ email: ticket.getPayload().email }, async (err, user) => {
            if (err) return res.sendStatus(500);

            user.trees.push(tree._id);
            await user.save();

            tree.users.push(user._id);
            await tree.save();

            res.sendStatus(200);
        });
    });
});

router.post('/:treeID/members', async (req, res) => {
    const ticket = await client.verifyIdToken({
        idToken: req.headers['authorization'].split(' ')[1],
        audience: CLIENT_ID

    }).catch(() => { res.status(401) });
    if (res.statusCode === 401) return res.sendStatus(401);

    trees.findById(req.params['treeID'], async (err, tree) => {
        if (err) return res.sendStatus(500);

        await members.create({ name: req.body['name'] }, async (err, member) => {
            if (err) return res.sendStatus(500);

            tree.members.push(member._id);
            await trees.findOneAndUpdate({ _id: req.params['treeID'] }, { $inc: { numMembers: 1}});
            // const num = tree.numMembers;
            // tree.numMembers = num + 1;
            tree.save();

            
            res.sendStatus(200);

        });
    });
});


router.post('/:treeID/members/:memberID/spouse', async (req, res) => {
    const ticket = await client.verifyIdToken({
        idToken: req.headers['authorization'].split(' ')[1],
        audience: CLIENT_ID

    }).catch(() => { res.status(401) });
    if (res.statusCode === 401) return res.sendStatus(401);

    trees.findById(req.params['treeID'], async (err, tree) => {
        if (err) return res.sendStatus(500);

        members.findById(req.params['memberID'], async (err, member) => {
            if (err) return res.sendStatus(500);

            await members.create({ name: req.body['name'] }, async (err, spouse) => {
                if (err) return res.sendStatus(500);

                tree.members.push(spouse._id);
                await trees.findOneAndUpdate({ _id: req.params['treeID'] }, { $inc: { numMembers: 1}});
                tree.save();

                member.spouse = spouse._id;
                member.save();

                await tree.populate([{ path: 'users' }, { path: 'members', populate: [{ path: 'fields' }, { path: 'spouse' }, { path: 'parents' }]}]);
                res.json(tree);
            });
        });
    });
});

router.post('/:treeID/members/:memberID/parents', async (req, res) => {
    const ticket = await client.verifyIdToken({
        idToken: req.headers['authorization'].split(' ')[1],
        audience: CLIENT_ID

    }).catch(() => { res.status(401) });
    if (res.statusCode === 401) return res.sendStatus(401);

    trees.findById(req.params['treeID'], async (err, tree) => {
        if (err) return res.sendStatus(500);

        members.findById(req.params['memberID'], async (err, member) => {
            if (err) return res.sendStatus(500);

            await members.create({ name: req.body['name'] }, async (err, parent) => {
                if (err) return res.sendStatus(500);

                tree.members.push(parent._id);
                await trees.findOneAndUpdate({ _id: req.params['treeID'] }, { $inc: { numMembers: 1}});
                tree.save();

                member.parents.push(parent._id);
                member.save();

                parent.children.push(member._id);
                parent.save();

                await tree.populate([{ path: 'users' }, { path: 'members', populate: [{ path: 'fields' }, { path: 'spouse' }, { path: 'parents' }]}]);
                res.json(tree);
            });
        });
    });
});

router.post('/:treeID/members/:memberID/children', async (req, res) => {
    
    const ticket = await client.verifyIdToken({
        idToken: req.headers['authorization'].split(' ')[1],
        audience: CLIENT_ID

    }).catch(() => { res.status(401) });
    if (res.statusCode === 401) return res.sendStatus(401);

    trees.findById(req.params['treeID'], async (err, tree) => {
        if (err) return res.sendStatus(500);

        members.findById(req.params['memberID'], async (err, member) => {
            if (err) return res.sendStatus(500);

            await members.create({ name: req.body['name'] }, async (err, child) => {
                if (err) return res.sendStatus(500);

                tree.members.push(child._id);
                await trees.findOneAndUpdate({ _id: req.params['treeID'] }, { $inc: { numMembers: 1}});
                tree.save();

                member.children.push(child._id);
                member.save();

                child.parents.push(member._id);
                child.save();

                res.sendStatus(200);
            });
        });
    });
});

router.delete('/:treeID/members/:memberID/children/:childID', async (req, res) => {
    const ticket = await client.verifyIdToken({
        idToken: req.headers['authorization'].split(' ')[1],
        audience: CLIENT_ID

    }).catch(() => { res.status(401) });
    if (res.statusCode === 401) return res.sendStatus(401);

    trees.findById(req.params['treeID'], async (err, tree) => {
        if (err) return res.sendStatus(500);

        members.findOneAndDelete({ _id: req.params['childID'] }, async (err) => {
            if (err) return res.sendStatus(500);
        });

        tree.members = tree.members.filter(member => member !== req.params['childID']);
        await tree.save();

        members.findById(req.params['memberID'], async (err, member) => {
            if (err) return res.sendStatus(500);

            member.children = member.children.filter(member => member !== req.params['childID']);
            await member.save();
        });

        res.sendStatus(200);
    });
});

router.post('/:treeID/users', async (req, res) => {
    const ticket = await client.verifyIdToken({
        idToken: req.headers['authorization'].split(' ')[1],
        audience: CLIENT_ID

    }).catch(() => { res.status(401) });
    if (res.statusCode === 401) return res.sendStatus(401);

    users.findOne({ email: req.params['email'] }, async (err, user) => {
        if (err) return res.sendStatus(500);

        trees.findById(req.params['treeID'], async (err, tree) => {
            if (err) return res.sendStatus(500);

            tree.users.push(user._id);
            await tree.save();

            user.trees.push(tree._id);
            await user.save();

            await tree.populate([{ path: 'users' }, { path: 'members', populate: { path: 'fields' }}]);
            res.json(tree);
        });
    });
});

router.patch('/:treeID/users/:userID', async (req, res) => {
    const ticket = await client.verifyIdToken({
        idToken: req.headers['authorization'].split(' ')[1],
        audience: CLIENT_ID

    }).catch(() => { res.status(401) });
    if (res.statusCode === 401) return res.sendStatus(401);

    trees.findById(req.params['treeID'], async (err, tree) => {
        if (err) return res.sendStatus(500);

        users.findById(req.params['userID'], async (err, user) => {
            if (err) return res.sendStatus(500);

            // TODO: Implement filter once permissions are implemented

            res.sendStatus(200);
        });
    });
});

router.delete('/:treeID/users/:userID', async (req, res) => {
    const ticket = await client.verifyIdToken({
        idToken: req.headers['authorization'].split(' ')[1],
        audience: CLIENT_ID

    }).catch(() => { res.status(401) });
    if (res.statusCode === 401) return res.sendStatus(401);

    trees.findById(req.params['treeID'], async (err, tree) => {
        if (err) return res.sendStatus(500);

        users.findById(req.params['userID'], async (err, user) => {
            if (err) return res.sendStatus(500);

            tree.users = tree.users.filter(user => user !== req.params['userID']);
            await tree.save();

            user.trees = user.trees.filter(tree => tree !== req.params['treeID']);
            await user.save();

            await tree.populate([{ path: 'users' }, { path: 'members', populate: { path: 'fields' }}]);
            res.json(tree);
        });
    });
});

router.delete('/:treeID/members/:memberID', async (req, res) => {
    const ticket = await client.verifyIdToken({
        idToken: req.headers['authorization'].split(' ')[1],
        audience: CLIENT_ID

    }).catch(() => { res.status(401) });
    if (res.statusCode === 401) return res.sendStatus(401);

    else {trees.findById(req.params['treeID'], async (err, tree) => {
        if (err) return res.sendStatus(500);

        members.findOneAndDelete({ _id: req.params['memberID'] }, async (err) => {
            if (err) return res.sendStatus(500);
        });

        tree.members = tree.members.filter(member => member !== req.params['memberID']);
        await tree.save();

        res.sendStatus(200);
    });
}
});

router.delete('/:treeID', async (req, res) => {
    const ticket = await client.verifyIdToken({
        idToken: req.headers['authorization'].split(' ')[1],
        audience: CLIENT_ID

    }).catch(() => { return res.sendStatus(401) });

    trees.findById(req.params['treeID'], async (err, tree) => {
        if (err) return res.sendStatus(500);

        await tree.populate([{ path: 'users' }, { path: 'members', populate: { path: 'fields' }}]);

        for (const user of tree.users) {
            user.trees = user.trees.filter(tree => tree._id !== req.params['treeID']);
            await user.save();
        }
    });

    trees.deleteOne({ _id: req.params['treeID'] }, (err) => {
        if (err) return res.sendStatus(500);
    });

    res.sendStatus(200);
});

export default router
