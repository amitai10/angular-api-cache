# Angular PWA - offline first

Angular offers out of the box PWA offline support both for assets and Api calls.

This is an example for weather application.
This application has a service worker that caches the static assets (angular js staff), and the calls to openweathermap.

Executing (you will need http-server installed before): 
```
ng build --prod'
cd dist/my-weather-app
http-server -c-1 .
```
Open browser on 'http://localhost:8080/'

Then search for few cities.

In order to work offline, Kill the server and the network.  
Refresh the page and search for the same cities, everything is working. Search for a new city you will get an error.




