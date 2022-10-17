const companyModel = require('../../../lib/db/models/company.model')
const JSONResponse = require('../../../lib/json.helper')
const JWTHelper = require('../../../lib/jwt.helper')
const S3Helper = require('../../../lib/s3.helper')

class companiesController {
	/**
	 * Get any user, by providing the matching ID
	 * @param {import('express').Request} req
	 * @param {import('express').Response} res
	 */
	static getAny(req, res) {
		const body = JSON.parse(req.params.obj)
		companyModel
			.find(body ?? {})
			.then((results) => {
				if (results.length > 0)
					JSONResponse.success(req, res, 200, 'Collected matching users', results)
				else JSONResponse.error(req, res, 404, 'Could not find any users')
			})
			.catch((err) => {
				JSONResponse.error(req, res, 500, 'Fatal error handling user model', err)
			})
	}

	/**
	 * Submit the data for a new user and send off the verification email
	 * @param {import('express').Request} req
	 * @param {import('express').Response} res
	 */
	static async signUp(req, res) {
		const body = req.body
		const now = Date.now().toString(16)
		const manageupload = await S3Helper.upload(req.files['logo'], `${now}logo`)
		if (manageupload) body.logo = { key: `${now}logo`, link: manageupload.Location }
		const manageupload2 = await S3Helper.upload(req.files['certificate'], `${now}cert`)
		if (manageupload2) body.certificate = { key: `${now}cert`, link: manageupload.Location }
		const new_user = new companyModel(body)
		const valResult = await new_user.validate().catch((err) => {
			JSONResponse.error(
				req,
				res,
				400,
				err.errors[Object.keys(err.errors)[Object.keys(err.errors).length - 1]].properties
					.message,
				err.errors[Object.keys(err.errors)[Object.keys(err.errors).length - 1]]
			)
		})
		if (valResult) {
			const saved_user = await new_user.save().catch((err) => {
				JSONResponse.error(req, res, 400, err.message, err)
			})
			JSONResponse.success(req, res, 201, saved_user)
		}
	}

	/**
	 * Use an email and password to log in to a user account
	 * @param {import('express').Request} req
	 * @param {import('express').Response} res
	 */
	static async signIn(req, res) {
		const body = req.body
		const user = await companyModel.findOne({ email: body.email }).catch((err) => {
			JSONResponse.error(req, res, 500, 'Fatal error handling user model', err)
		})
		if (user) {
			const login = await result.SignIn(body.password).catch((err) => {
				JSONResponse.error(req, res, 500, 'Fatal Error! Server Down!', err)
			})
			if (login) {
				JWTHelper.setToken(
					req,
					res,
					{
						type: 1,
						self: result._id.toString(),
					},
					'jwt_auth'
				)
				JSONResponse.success(req, res, 200, 'Successful login')
			} else {
				JSONResponse.error(req, res, 401, 'Password does not match')
			}
		} else JSONResponse.error(req, res, 404, 'Account does not exist')
	}

	/**
	 * Resumes an active jwt implemented session
	 * @param {import('express').Request} req
	 * @param {import('express').Response} res
	 */
	static async session(req, res) {
		const decoded = JWTHelper.getToken(req, res, 'jwt_auth')
		if (decoded && decoded.type == 1) {
			const user = await companyModel.findById(decoded.self).catch((err) => {
				JSONResponse.error(req, res, 500, 'Failure handling user model', err)
			})
			if (user) JSONResponse.success(req, res, 200, 'Session resumed', user)
			else JSONResponse.error(req, res, 404, 'Account does not exist')
		} else JSONResponse.error(req, res, 401, 'No session!')
	}

	//Update
	/**
	 * Activate a user account for whatever purposes
	 * @param {import('express').Request} req
	 * @param {import('express').Response} res
	 */
	static async verifyUser(req, res) {
		const uid = req.params.id
		const user = await companyModel.findByIdAndUpdate(uid, { active: true }).catch((err) => {
			res.status(500).render('verify', {
				Title: 'Fatal Error! Server Down!',
				Details: err.message,
			})
		})
		if (user) {
			res.status(200).render('verify', {
				Title: 'User verified successfully',
				Link: 'https://your.website/login',
			})
		} else {
			res.status(200).render('verify', {
				Title: 'No User Found!',
				Details: `Trying copying your activation link directly if you attempted to type it`,
			})
		}
	}

	/**
	 * Updates the current user with new data
	 * @param {import('express').Request} req
	 * @param {import('express').Response} res
	 */
	static async updateUser(req, res) {
		const body = req.body
		body.logo = req.file
		const decoded = JWTHelper.getToken(req, res, 'jwt_auth')
		const uid = decoded.self
		const user = await companyModel.findByIdAndUpdate(uid, body, { new: true }).catch((err) => {
			JSONResponse.error(req, res, 500, err.message, err)
		})
		if (user) {
			JSONResponse.success(req, res, 200, 'Successfully updated user', result)
		} else JSONResponse.error(req, res, 404, 'Could not find specified user')
	}

	/**
	 * Updates any user provided an ID
	 * @param {import('express').Request} req
	 * @param {import('express').Response} res
	 */
	static async updateUserAny(req, res) {
		const uid = req.params.id
		const body = req.body
		body.logo = req.file
		const user = await companyModel.findByIdAndUpdate(uid, body, { new: true }).catch((err) => {
			JSONResponse.error(req, res, 500, err.message, err)
		})
		if (user) {
			JSONResponse.success(req, res, 200, 'Successfully updated user', result)
		} else JSONResponse.error(req, res, 404, 'Could not find specified user')
	}

	/**
	 * Deletes the current user
	 * @param {import('express').Request} req
	 * @param {import('express').Response} res
	 */
	static async destroyUser(req, res) {
		const decoded = JWTHelper.getToken(req, res, 'jwt_auth')
		const uid = decoded.self
		const user = await companyModel.findByIdAndDelete(uid).catch((err) => {
			JSONResponse.error(req, res, 500, 'Fatal error handling user model', err)
		})
		if (user) {
			JSONResponse.success(req, res, 200, 'Successfully removed user')
		} else {
			JSONResponse.error(req, res, 404, 'Could not find specified user')
		}
	}

	/**
	 * Deletes any user provided an ID
	 * @param {import('express').Request} req
	 * @param {import('express').Response} res
	 */
	static async destroyUserAny(req, res) {
		const uid = req.params.id
		const user = await companyModel.findByIdAndDelete(uid).catch((err) => {
			JSONResponse.error(req, res, 500, 'Fatal error handling user model', err)
		})
		if (user) {
			JSONResponse.success(req, res, 200, 'Successfully removed user')
		} else {
			JSONResponse.error(req, res, 404, 'Could not find specified user')
		}
	}
}
module.exports = companiesController
