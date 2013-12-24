from bottle import *
from app import get_buildings

import time

@get('/simulate')
def simulate_get():
	return template('simulate')

@post('/simulate')
def simulate_post():
	start_time=time.time()

	tbl = get_buildings()

	end_time=time.time()
	print("Elapsed time of get_buildings was %g seconds" % (end_time - start_time))

	return template('results', {"name": request.forms['name'],
								"data": tbl})


# Static Routes
@get('/<filename:re:.*\.js>')
def javascripts(filename):
	return static_file(filename, root='static/js')

@get('/<filename:re:.*\.css>')
def stylesheets(filename):
    return static_file(filename, root='static/css')

@get('/<filename:re:.*\.(jpg|png|gif|ico)>')
def images(filename):
    return static_file(filename, root='static/img')

@get('/<filename:re:.*\.(eot|ttf|woff|svg)>')
def fonts(filename):
    return static_file(filename, root='static/fonts')


run(host='localhost', port=8080)