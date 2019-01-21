import { Component } from '@angular/core';
import { ngswAppInitializer } from '@angular/service-worker/src/module';
import * as moment from 'moment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  forecast = [];
  city: string = 'London';
  cityTitle: string = 'London';

  ngOnInit() {
    this.fetchForecast();
  }

  async fetchForecast() {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${this.city}&units=metric&APPID=b1f79e77b2b077ea0ff26a650d8432af`);
    const json = await res.json();

    this.forecast =  json.list.filter((l) => moment(l.dt_txt).hour() === 12).map((dayForecast) => {
      return {
        icon: `http://openweathermap.org/img/w/${dayForecast.weather[0].icon}.png`,
        description: dayForecast.weather[0].description,
        temp: Math.round(dayForecast.main.temp),
        date: moment(dayForecast.dt_txt).format("ddd")
      };
    });
    this.cityTitle = this.city;
  }
}
