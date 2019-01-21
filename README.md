# Angular - offline first

PWA (progressive web application) is the future (present) of web applications. It has all the benefits of mobile applications (push notification, offline support, lunch icon etc.), And the user does not need to go to the store and install it from there, only navigate to the URL.

Angular has great support for PWAs. You get all PWA features out of the box.

In this blog post, I will explain and give example for offline support.

First I will explain what’s service-worker and how it works, and then I will build a simple weather application that can be used even when there is no network.

## Service workers
Service workers act as a proxy between the application and the network. They intercept network requests and take actions based on whether the network is available, and update assets residing on the server. They will also allow access to push notifications and background sync APIs.

Basically, service worker is a javascript file that runs in the background of the application.
Service worker has few life cycles:

- Registration
- Installation
- Activation
- Update

Due to security issues, the service worker will only work on https (or localhost).
By adding event listeners to the service worker you can manipulate the events. For instance, by listening to ‘fetch’ events you can add the results to the cache and fetch it from th cache if there is no network:
```js
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - return response
        if (response) {
          return response;
        }

        return fetch(event.request).then(
          function(response) {
            // Check if we received a valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            var responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
    );
});

``` 

There is no magic in service workers, it is just a defined architecture to solve common problems. Because service workers run in a worker context they cannot access the DOM or use APIs such as synchronous XHR and localStorage can't be used inside a service worker. It is async and they are non blocking.

A quick notice is that service workers are not supported in old browsers and you might want to verify that it is suitable for your product.


## Angular Service workers
Angular creates a service worker for us. All we need to do is change its configuration, so we do not need to get our hands dirty with low-level APIs, and still have all the benefits.
Angular 5  introduced the @angular/service-worker package.
In order to use it we add PWA support to our application. It will add all necessary items to our code, from generation the service worker files, register the service worker add a configuration file (ngsw-config.json) where we can control the service worker behavior. 
When building the application with --prod flag, it will generate two files to the dist folder:

- ngsw-worker.js - the js file that contains the logic of the service worker
- ngsw.json - the configuration.

## The weather application
I will show how to build a simple weather application that supports offline mode, it will show the forecast in cities even if there is no network connection, if the user already checked them.
I will start by creating the application and add PWA support. Before that, it will be wise to update angular-cli to the latest version because there are many improvements, especially around service workers.
```
ng new my-weather-app --service-worker 
# you can add it by using ng add @angular/pwa my-weather-app if it is already exists
```
I will update app.component.html and app.component.ts. It will fetch data from open-weather-map according to the requested city and display it on the screen.
```html
<div class="container">
  <div class="city">
    <div class="text">Select city: </div>
    <input type="text" [(ngModel)]="city" (keydown.enter)="fetchForecast()">
  </div>
  <div class="title">Forecast in {{cityTitle}}</div>
  <div class="weather-container">
    <div class="forecast" *ngFor="let item of forecast">
      <div class="cube">
        <div class="date">{{item.date}}</div>
        <div class="icon">
          <img src="{{item.icon}}" alt="">
        </div>
        <div class="temp">{{item.temp}} &#176;</div>
      </div>
    </div>
  </div>
  <div class="error">{{error}}</div>
</div>
```
app.component.ts:
```ts
import { Component } from "@angular/core";
import { ngswAppInitializer } from "@angular/service-worker/src/module";
import * as moment from "moment";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"]
})
export class AppComponent {
  forecast = [];
  city: string = "London";
  cityTitle: string = "London";
  error: string = "";

  ngOnInit() {
    this.fetchForecast();
  }

  async fetchForecast() {
    this.error = "";
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?q=${
          this.city
        }&units=metric&APPID=xxxxxxxxxxxxxxxxx`
      );
      const json = await res.json();

      this.forecast = json.list
        .filter(l => moment(l.dt_txt).hour() === 12)
        .map(dayForecast => {
          return {
            icon: `http://openweathermap.org/img/w/${
              dayForecast.weather[0].icon
            }.png`,
            description: dayForecast.weather[0].description,
            temp: Math.round(dayForecast.main.temp),
            date: moment(dayForecast.dt_txt).format("ddd")
          };
        });
      this.cityTitle = this.city;
    } catch (error) {
      this.error = "Could not fetch weather";
    }
  }
}
```
There is nothing interesting here, it will show:
![alt weather-app](https://github.com/amitai10/angular-api-cache/blob/master/img.png)


In order to save the cache the API calls by the server worker I will add a dataGroups to the ngsw-config.json:
```js
{
  "index": "/index.html",
  "assetGroups": [{
    "name": "app",
    "installMode": "prefetch",
    "resources": {
      "files": [
        "/favicon.ico",
        "/index.html",
        "/*.css",
        "/*.js"
      ]
    }
  }, {
    "name": "assets",
    "installMode": "lazy",
    "updateMode": "prefetch",
    "resources": {
      "files": [
        "/assets/**",
        "/*.(eot|svg|cur|jpg|png|webp|gif|otf|ttf|woff|woff2|ani)"
      ]
    }
  }],
  "dataGroups": [{
    "name": "api.openweathermap.org",
    "urls": ["https://api.openweathermap.org/data/2.5/*"],
    "cacheConfig": {
      "maxSize": 100,
      "maxAge": "1d",
      "strategy": "freshness"
    }
  }]
}
```
As you can see I added the Url of open-weather-map, with max age of one day and size of 100 results.
## Executing the application
As mentioned before, service workers only work in production so we will build the application:
```
ng build --prod
```
And then run local http-server to host the app (the -c-1 . flag will disable server caching):
```
cd dist/my-weather-app
http-server -c-1 .  
```

Now we can navigate to http://localhost:8080/ and view the application.
Try to insert a few destinations and view their upcoming weather.
Now we will examine working offline. Kill the http-server and disable the network. Refresh the page - the application works! And you get data. Try your previous locations, you get their forecasts. Try a new destination - the application cannot fetch it.

## Updating cache items
Every time the user reloads the application, the service worker checks if there are changes, and then uploads the new assets. It will be shown in the next reload. There are different ways and methods how to cache items or invalidate them, you can read about it in the official [documentation](https://angular.io/guide/service-worker-config).

## chrome dev tools
In chrome’s dev-tools you can view your service worker’s state, including its cached items. Open dev-tools and go to ‘application->service-workers’, you can see your registered service.
Go to ‘application->cache’, you can see all cached assets and data from the API.

Application code can be found [here](https://github.com/amitai10/angular-api-cache).

## Conclusion
PWAs are the present and future of web development. A major reason is their offline support, especially for mobile devices. Service workers help to achieve these offline capabilities with minimum effort from the developer. Angular makes things even more comfortable and easy by creating these service-workers for us.
I encourage you to use them and add this functionality to your application and by doing that, improve your products.

## References
- https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- https://developers.google.com/web/fundamentals/primers/service-workers/
- https://angular.io/guide/service-worker-config
