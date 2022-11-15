const { compare, hash, genSaltSync } = require('bcrypt')
const emailHelper = require('../../email.helper.js')
const db = require('../db.js')
require('dotenv').config()
const { DOMAIN } = process.env

let userSchema = new db.Schema({
	name: { type: String, required: [true, 'No name provided'] },
	email: {
		type: String,
		unique: [true, 'Login exists for this email'],
		required: [true, 'No email provided'],
	},
	password: {
		type: String,
		minLength: [8, 'Password too short'],
		maxLength: [16, 'Password too long'],
		required: [true, 'No password provided'],
	},
	active: {
		type: Boolean,
		default: false,
		required: [true, 'No active state provided'],
	},
})

/**
 * Do password verification and hashing at savetime
 */
userSchema.pre('save', async function (next, opts) {
	this.active = false
	if (
		/^(?=.*\d)(?=.*[A-Z])(?=.*[a-z])((?=.*[^\w\d\s:])|(?=.*[_]))([^\s])*$/gm.test(this.password)
	) {
		const _hash = await hash(this.password, genSaltSync(12)).catch((err) => {
			throw new Error('Failure hashing password')
		})
		this.password = _hash
		next()
	} else throw new Error('Password does not meet requirements \n Password must be between eight and sixteen characters \n Password must have one letter \n Password must have one number \n Password must have one symbol')
})

/**
 * Send verify email right after the user is created
 */
userSchema.post('save', function (doc) {
	emailHelper.sendMail(
		doc.email,
		'API no-reply',
		`Please click the link to confirm that this is you creating an account on our platform.\n${DOMAIN}/api/v1/users/verify/${doc._id}`
	)
})

/**
 * Sign into this user if the password is correct
 * @param {string} password
 * @returns Promise
 */
userSchema.methods.SignIn = function (password) {
	return new Promise(async (resolve, reject) => {
		const same = await compare(password, this.password).catch((err) => {
			reject(err)
		})
		if (same) resolve(true)
		resolve(false)
	})
}

const userModel = db.model('users', userSchema)
module.exports = userModel
