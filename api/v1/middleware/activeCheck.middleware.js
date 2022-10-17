const adminModel = require('../../../lib/db/models/admin.model')
const userModel = require('../../../lib/db/models/user.model')
const JSONResponse = require('../../../lib/json.helper')
const JWTHelper = require('../../../lib/jwt.helper')

const activeCheck = async (req, res, next) => {
	let decoded = JWTHelper.getToken(req, res, 'jwt_auth')
	let result
	switch (decoded.type) {
		case 1:
			result = await userModel.findById(decoded.self)
			if (!result.active) {
				JSONResponse.error(req, res, 401, 'Email unverified')
				return
			} else if (!result.admin_active) {
				JSONResponse.error(req, res, 401, 'Certificate still processing')
				return
			} else next()
			break
		default:
			next()
	}
}

module.exports = activeCheck
