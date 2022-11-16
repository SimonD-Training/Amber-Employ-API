const router = require('express').Router()
const multer = require('multer')
const upload = multer()
const companiesController = require('./controllers/companies.controller')
const adminsController = require('./controllers/admins.controller')
const typeCheck = require('./middleware/typeCheck.middleware')
const postsController = require('./controllers/posts.controller')
const activeCheck = require('./middleware/activeCheck.middleware')
const usersController = require('./controllers/users.controller')
const S3Helper = require('../../lib/s3.helper')
const JSONResponse = require('../../lib/json.helper')
const { bufferToStream } = require('../../lib/converters.helper')

/**
 * Generates the API Docs from the list of routes in the system and attaches descriptions to them
 * from the descriptions array, when you add routes, it will change on the next load to reflect new routes
 * automatically. They appear in the same order as they are written in the code, match the array descriptions
 * to this order.
 */
router.all('', (req, res) => {
	let concat = []
	for (let layer of router.stack) {
		concat.push({
			path: layer.route.path,
			methods: Object.keys(layer.route.methods),
		})
	}
	const descriptions = [
		`API DOCS URL`,
		`Manage users as a CRUD collection where an ID is not needed. &nbsp;
		POST to Sign Up &nbsp;
		GET to validate a session or (admin) Get users as CRUD collection with pagination and filtration &nbsp;
		PATCH to update the current user &nbsp;
		DELETE to delete the current user`,
		`Log In as a user`,
		`Verify a new account`,
		`Administrative management of users as a CRUD collection where an ID is needed. &nbsp;
		GET to retrieve a user by ID &nbsp;
		PATCH to update a user by ID &nbsp;
		DELETE to delete a user by ID`,
		`Manage companies as a CRUD collection where an ID is not needed. &nbsp;
		POST to Sign Up &nbsp;
		GET to validate a session or (admin) Get companies as CRUD collection with pagination and filtration &nbsp;
		PATCH to update the current company &nbsp;
		DELETE to delete the current company`,
		`Log In as a company`,
		`Verify a new account`,
		`Administrative management of companiess as a CRUD collection where an ID is needed. &nbsp;
		GET to retrieve a company by ID &nbsp;
		PATCH to update a company by ID &nbsp;
		DELETE to delete a company by ID`,
		`Route for managing logins and session resumption for admins.`,
		`Manage posts as a CRUD collection where an ID is not needed. &nbsp;
		POST to create a new post &nbsp;
		GET to seek posts with pagination and optional filtering`,
		`GET all your posts as a company`,
		`Manage posts as a CRUD collection where an ID is needed. &nbsp;
		GET to get a post &nbsp;
		PATCH to update one of your posts &nbsp;
		DELETE to delete one of your posts`,
		`Administrative management of posts as a CRUD collection where an ID is needed. &nbsp;
		GET to get any post &nbsp;
		PATCH to update any post &nbsp;
		DELETE to delete any post`,
		`Log out for any session.`,
		`Access S3 stored files`,
	]
	let body = {
		name: 'AmberEmployAPI v1',
		version: '1.0.0',
		routes: concat,
		description: descriptions,
	}
	res.render('summary', body)
})

// TODO Conform controllers to the below
router
	.route('/users')
	.post(usersController.signUp)
	.get(usersController.session, /*typeCheck(['admin']),*/ usersController.get)
	.patch(usersController.updateUser)
	.delete(usersController.destroyUser)

router.all('/users/login', usersController.signIn)

router.all('/users/verify/:id([a-fA-Fd]{24})', usersController.verifyUser)

router
	.route('/users/:id([a-fA-Fd]{24})')
	// .all(typeCheck(['admin']))
	.get(usersController.getId)
	.patch(usersController.updateUserAny)
	.delete(usersController.destroyUserAny)

router
	.route('/companies')
	.post(
		upload.fields([
			{ name: 'logo', maxCount: 1 },
			{ name: 'certificate', maxCount: 1 },
		]),
		companiesController.signUp
	)
	.get(companiesController.session, /*typeCheck(['admin']),*/ companiesController.get)
	.patch(companiesController.updateCompany)
	.delete(companiesController.destroyCompany)

router.all('/companies/login', companiesController.signIn)

router.all('/companies/verify/:id([a-fA-Fd]{24})', companiesController.verifyCompany)

router
	.route('/companies/:id([a-fA-Fd]{24})')
	.get(companiesController.getId)
	// .all(typeCheck(['admin']))
	.patch(companiesController.updateCompanyAny)
	.delete(companiesController.destroyCompanyAny)

router.route('/admin').post(adminsController.signIn).get(adminsController.session)

router
	.route('/posts')
	.get(postsController.get)
	// .all(typeCheck(['company']), activeCheck)
	.post(upload.single('banner'), postsController.add)

router
	.route('/posts/company')
	.all(typeCheck(['company']), activeCheck)
	.get(postsController.getMine)

router
	.route('/posts/:id([a-fA-Fd]{24})')
	// .all(typeCheck(['user', 'admin']), activeCheck)
	.get(postsController.getOne)
	// .all(typeCheck(['user']))
	.patch(postsController.update)
	.delete(postsController.destroy)

router
	.route('/posts/admins/:id([a-fA-Fd]{24})')
	// .all(typeCheck(['admin']))
	.patch(postsController.updateAny)
	.delete(postsController.destroyAny)

router.route('/logout').all(logout)

router.route('/s3/:key').get(
	/*typeCheck(['user', 'admin']),*/ async (req, res) => {
		let file = await S3Helper.download(req.params.key).catch((err) => {
			console.error(err)
			JSONResponse.error(req, res, 500, 'Failed to communicate with file storage')
		})
		let responseStream = bufferToStream(file.Body)
		if (file) {
			responseStream.pipe(res)
		} else JSONResponse.error(req, res, 404, 'File not found')
	}
)

module.exports = router

function logout(req, res) {
	JWTHelper.killToken(req, res, 'jwt_auth')
	JSONResponse.success(req, res, 200, 'Logged out successfully!')
}
