const { decode } = require('jsonwebtoken')
const postModel = require('../../../lib/db/models/post.model')
const JSONResponse = require('../../../lib/json.helper')
const JWTHelper = require('../../../lib/jwt.helper')
const S3Helper = require('../../../lib/s3.helper')

class postsController {
	//Read
	/**
	 * Get all posts
	 * @param {import('express').Request} req
	 * @param {import('express').Response} res
	 */
	static async get(req, res) {
		let { page, limit, field, value } = req.query
		let filterBody = {}
		if (field.length == value.length) {
			field.forEach((e, index) => {
				filterBody[e] = value[index]
			})
		}
		if (page < 0) page = 1
		const list = await postModel
			.find(filterBody)
			.skip((page - 1) * limit)
			.limit(limit)
			.catch((err) => {
				JSONResponse.error(req, res, 500, 'Database Error', err)
			})
		if (list.length > 0)
			JSONResponse.success(req, res, 200, 'Collected matching documents', list)
		else JSONResponse.error(req, res, 404, 'Could not find any matching documents')
	}

	/**
	 * Get your posts
	 * @param {import('express').Request} req
	 * @param {import('express').Response} res
	 */
	static async get(req, res) {
		const decoded = JWTHelper.getToken(req, res, 'jwt_auth')
		const list = await postModel.find({ author: decoded.self }).catch((err) => {
			JSONResponse.error(req, res, 500, 'Database Error', err)
		})
		if (list.length > 0)
			JSONResponse.success(req, res, 200, 'Collected matching documents', list)
		else JSONResponse.error(req, res, 404, 'Could not find any matching documents')
	}

	//Create
	/**
	 * Create a new post
	 * @param {import('express').Request} req
	 * @param {import('express').Response} res
	 */
	static async add(req, res) {
		let body = req.body
		const now = Date.now().toString(16)
		const manageupload = await S3Helper.upload(req.files['banner'], `${now}banner`)
		if (manageupload) body.banner = { key: `${now}banner`, link: manageupload.Location }
		let newdoc = new postModel(body)
		let invalid = undefined
		await newdoc.validate().catch((err) => {
			invalid = true
			JSONResponse.error(
				req,
				res,
				400,
				err.errors[Object.keys(err.errors)[Object.keys(err.errors).length - 1]].properties
					.message,
				err.errors[Object.keys(err.errors)[Object.keys(err.errors).length - 1]]
			)
		})
		if (!invalid) {
			const newerdoc = await newdoc.save().catch((err) => {
				JSONResponse.error(req, res, 500, 'Database Error', err)
			})
			if (newerdoc)
				JSONResponse.success(req, res, 202, 'Document added successfully', newerdoc)
		}
	}

	//Delete
	/**
	 * Erase any post by ID
	 * @param {import('express').Request} req
	 * @param {import('express').Response} res
	 */
	static async destroyAny(req, res) {
		let id = req.params.id
		const olddoc = await postModel.findByIdAndDelete(id).catch((err) => {
			JSONResponse.error(req, res, 500, 'Database Error', err)
		})

		if (olddoc) {
			JSONResponse.success(req, res, 200, 'Successfully removed document')
		} else {
			JSONResponse.error(req, res, 404, 'Could not find document')
		}
	}

	/**
	 * Erase your post by ID
	 * @param {import('express').Request} req
	 * @param {import('express').Response} res
	 */
	static async destroy(req, res) {
		const decoded = JWTHelper.getToken(req, res, 'jwt_auth')
		let id = req.params.id
		const olddoc = await postModel
			.findOneAndDelete({ _id: id, author: decoded.self })
			.catch((err) => {
				JSONResponse.error(req, res, 500, 'Database Error', err)
			})

		if (olddoc) {
			JSONResponse.success(req, res, 200, 'Successfully removed document')
		} else {
			JSONResponse.error(req, res, 404, 'Could not find document')
		}
	}

	//Update
	/**
	 * Update any post by ID
	 * @param {import('express').Request} req
	 * @param {import('express').Response} res
	 */
	static async updateAny(req, res) {
		let id = req.params.id
		let body = req.body
		body.banner = req.file
		const newdoc = await postModel.findByIdAndUpdate(id, body).catch((err) => {
			JSONResponse.error(req, res, 500, 'Database Error', err)
		})
		if (newdoc) {
			JSONResponse.success(req, res, 200, 'Successfully updated document', newdoc)
		} else {
			JSONResponse.error(req, res, 404, 'Could not find document')
		}
	}

	/**
	 * Update any post by ID
	 * @param {import('express').Request} req
	 * @param {import('express').Response} res
	 */
	static async update(req, res) {
		const decoded = JWTHelper.getToken(req, res, 'jwt_auth')
		let id = req.params.id
		let body = req.body
		body.banner = req.file
		const newdoc = await postModel
			.findOneAndUpdate({ _id: id, author: decoded.self }, body)
			.catch((err) => {
				JSONResponse.error(req, res, 500, 'Database Error', err)
			})
		if (newdoc) {
			JSONResponse.success(req, res, 200, 'Successfully updated document', newdoc)
		} else {
			JSONResponse.error(req, res, 404, 'Could not find document')
		}
	}
}

module.exports = postsController
