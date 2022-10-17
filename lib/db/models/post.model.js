const db = require('../db.js')

let postSchema = new db.Schema({
	title: {
		type: String,
		required: [true, 'No name provided'],
	},
	banner: {
		type: { key: String, link: String },
		required: [true, 'No banner provided'],
	},
	position: {
		type: String,
		required: [true, 'No position provided'],
	},
	requirements: {
		type: String,
		required: [true, 'No requirements provided'],
	},
	tel: {
		type: String,
		required: [true, 'No telephone number provided'],
	},
	email: {
		type: String,
		required: [true, 'No email provided'],
	},
	mailing_addres: {
		type: String,
		required: [true, 'No email provided'],
	},
	author: {
		type: db.Types.ObjectId,
		ref: 'companies',
		required: [true, 'Post must have an author'],
	},
})

// TODO
// Implement pre-update
postSchema.pre('findOneAndUpdate', async function (next, opts) {
	if (this.logo) {
		const docToUpdate = await this.model.findOne(this.getQuery())
		const now = Date.now().toString(16)
		const manageupload = await S3Helper.upload(this.banner, `${now}banner`)
		if (manageupload) {
			this.set({
				logo: { key: `${now}banner`, link: manageupload.Location },
			})
			const oldKey = docToUpdate.banner.key
			await S3Helper.delete(oldKey)
			next()
		} else throw new Error('Upload failed')
	}
})

const itemModel = db.model('posts', postSchema)
module.exports = itemModel
