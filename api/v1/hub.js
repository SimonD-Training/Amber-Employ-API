const router = require('express').Router()
const multer = require('multer')
const itemsController = require('./controllers/items.controller')
const upload = multer()
const companiesController = require('./controllers/companies.controller')
const adminsController = require('./controllers/admins.controller')
const typeCheck = require('./middleware/typeCheck.middleware')
const postsController = require('./controllers/posts.controller')
const activeCheck = require('./middleware/activeCheck.middleware')

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
		`Route for managing logins, session resumptions, user profile updates and deleting profile.`,
		`Activates a newly registered user.`,
		`Registers a new user.`,
		`Administrative management of users via IDs.`,
		`Route for managing logins and session resumption for admins.`,
		`Route for collecting all items or (admin)creating an item.`,
		`Administrative management of items via IDs.`,
		`Log out for any session.`,
	]
	let body = {
		name: 'BasicAPI v1',
		version: '1.0.0',
		routes: concat,
		description: descriptions,
	}
	res.render('summary', body)
})

router
	.route('/company')
	.post(companiesController.signIn)
	.get(companiesController.session)
	.patch(upload.fields(['logo', 'certificate']), companiesController.updateUser)
	.delete(logout)
router.route('/company/register/:id').get(companiesController.verifyUser)
router
	.route('/company/register')
	.post(upload.fields(['logo', 'certificate']), companiesController.signUp)
	.delete(companiesController.destroyUser)
router
	.route('/companies/:id')
	.all(typeCheck(['admin']))
	.get(companiesController.getAny)
	.patch(companiesController.updateUserAny)
	.delete(companiesController.destroyUserAny)

router.route('/admin').post(adminsController.signIn).get(adminsController.session)

router
	.route('/posts')
	.all(typeCheck('user'), activeCheck)
	.post(postsController.add)
	.get(postsController.get)

router
	.route('/posts/:id')
	.all(typeCheck('user'), activeCheck)
	.patch(activeCheck, postsController.update)
	.delete(activeCheck, postsController.destroy)

router
	.route('/posts/admins/:id')
	.all(typeCheck('admin'))
	.patch(activeCheck, postsController.updateAny)
	.delete(activeCheck, postsController.destroyAny)
// router
// 	.route('/items')
// 	.get(itemsController.get)
// 	.all(typeCheck(['admin']))
// 	.post(upload.single('image'), itemsController.add)
// router
// 	.route('/items/:id')
// 	.all(typeCheck(['admin']))
// 	.patch(itemsController.update)
// 	.delete(itemsController.destroy)

router.route('/logout').all(logout)

module.exports = router

function logout(req, res) {
	JWTHelper.killToken(req, res, 'jwt_auth')
	JSONResponse.success(req, res, 200, 'Logged out successfully!')
}
