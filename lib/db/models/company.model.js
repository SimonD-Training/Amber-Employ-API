const { compare, hash, genSaltSync } = require('bcrypt')
const emailHelper = require('../../email.helper.js')
const S3Helper = require('../../s3.helper.js')
const db = require('../db.js')
require('dotenv').config()
const { DOMAIN } = process.env

let companySchema = new db.Schema({
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
	address: { type: String, required: [true, 'No address provided'] },
	logo: {
		type: { key: String, link: String },
		required: [true, 'No profile avatar provided'],
	},
	certificate: {
		type: { key: String, link: String },
		required: [true, 'No certificate file provided'],
	},
	active: {
		type: Boolean,
		default: false,
		required: [true, 'No active state provided'],
	},
	admin_active: {
		type: Boolean,
		default: false,
		required: [true, 'No admin active state provided'],
	},
})

/**
 * Do password verification and hashing at savetime
 */
companySchema.pre('save', async function (next, opts) {
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
companySchema.post('save', function (doc) {
	emailHelper.sendMail(
		doc.email,
		'API no-reply',
		`Please click the link to confirm that this is you creating an account on our platform.\n${DOMAIN}/api/v1/users/verify/${doc._id}`
	)
})

/**
 * Logic for when a new profile picture or certificate is uploaded by a user, to replace the old one and delete it from AWS S3
 */
companySchema.pre('findOneAndUpdate', async function (next, opts) {
	if (this.logo) {
		const docToUpdate = await this.model.findOne(this.getQuery())
		const now = Date.now().toString(16)
		const manageupload = await S3Helper.upload(this.logo, `${now}logo`)
		const manageupload2 = await S3Helper.upload(this.certificate, `${now}cert`).catch(async () => {
			await S3Helper.delete(`${now}logo`)
		})
		if (manageupload && manageupload2) {
			this.set({
				logo: { key: `${now}logo`, link: manageupload.Location },
				certificate: { key: `${now}cert`, link: manageupload.Location },
			})
			const oldKey = docToUpdate.logo.key
			await S3Helper.delete(oldKey)
			next()
		} else throw new Error('Upload failed')
	}
})

/**
 * Sign into this user if the password is correct
 * @param {string} password
 * @returns Promise
 */
companySchema.methods.SignIn = function (password) {
	return new Promise(async (resolve, reject) => {
		const same = await compare(password, this.password).catch((err) => {
			reject(err)
		})
		if (same) resolve(true)
		resolve(false)
	})
}

const companyModel = db.model('companies', companySchema)
module.exports = companyModel
