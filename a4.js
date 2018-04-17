//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//:::                                                                         :::
//:::  This routine calculates the distance between two points (given the     :::
//:::  latitude/longitude of those points). It is being used to calculate     :::
//:::  the distance between two locations using GeoDataSource (TM) prodducts  :::
//:::                                                                         :::
//:::  Definitions:                                                           :::
//:::    South latitudes are negative, east longitudes are positive           :::
//:::                                                                         :::
//:::  Passed to function:                                                    :::
//:::    lat1, lon1 = Latitude and Longitude of point 1 (in decimal degrees)  :::
//:::    lat2, lon2 = Latitude and Longitude of point 2 (in decimal degrees)  :::
//:::    unit = the unit you desire for results                               :::
//:::           where: 'M' is statute miles (default)                         :::
//:::                  'K' is kilometers                                      :::
//:::                  'N' is nautical miles                                  :::
//:::                                                                         :::
//:::  Worldwide cities and other features databases with latitude longitude  :::
//:::  are available at https://www.geodatasource.com                          :::
//:::                                                                         :::
//:::  For enquiries, please contact sales@geodatasource.com                  :::
//:::                                                                         :::
//:::  Official Web site: https://www.geodatasource.com                        :::
//:::                                                                         :::
//:::               GeoDataSource.com (C) All Rights Reserved 2017            :::
//:::                                                                         :::
//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

const distance = (lat1, lon1, lat2, lon2, unit) => {
  var radlat1 = Math.PI * lat1 / 180;
  var radlat2 = Math.PI * lat2 / 180;
  var theta = lon1 - lon2;
  var radtheta = Math.PI * theta / 180;
  var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math
    .cos(radlat2) * Math.cos(radtheta);
  dist = Math.acos(dist);
  dist = dist * 180 / Math.PI;
  dist = dist * 60 * 1.1515;
  if (unit == "K") { dist = dist * 1.609344; }
  if (unit == "N") { dist = dist * 0.8684; }
  return dist
}

const distance2 = (p, q, dist) => {
  return distance(p[1], p[0], q[1], q[0], 'M') <= dist;
}

$(document).ready(() => {
  var mymap = new L.map('leaflet').setView([42.35806, -71.06361], 13);
  L.tileLayer(
    'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}',
    {
      attribution:
        'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
      maxZoom: 18,
      id: 'mapbox.streets',
      accessToken: 'pk.eyJ1IjoibW9vZHNwYWNlIiwiYSI6ImNqZnJjanVkNzJxa2cyeG1rZDhlNWxkZGEifQ.p9EYGfNtWDHLd71gk8olvw',
    },
  ).addTo(mymap);

  let loaded = 0;

  let cats = {};
  let catsByPop = [];
  let selectedFilters = [];
  let ratingFilter = 0;
  let distanceFilter = 10000;

  let streetsLayer;
  let pinsLayer;

  let filterStreetsEvent;
  let filterPinsEvent;

  d3.json('streets.geojson', (data) => {
    filterStreetsEvent = () => {
      const ne = mymap.getBounds()._northEast;
      const sw = mymap.getBounds()._southWest;
      const filterStreets = (ft) => {
        let contains = false;
        ft.geometry.coordinates.forEach((cd) => {
          if (d3.polygonContains([
              [ne.lng, ne.lat],
              [ne.lng, sw.lat],
              [sw.lng, sw.lat],
              [sw.lng, ne.lat]
            ], cd)) {
            contains = true;
          }
        });
        return contains;
      };

      let features = data.features.filter(filterStreets);
      features = _.sortBy(features, (ft) => ft.properties.SHAPElen).reverse();
      if (features.length > 1000) {
        features = features.slice(0, 1000);
      }
      if (streetsLayer) {
        mymap.removeLayer(streetsLayer);
      }
      streetsLayer = L.geoJson(features);
      streetsLayer.addTo(mymap);
    };

    loadDone();
  });

  const droppinBind = (feature, layer) => {
    // does this feature have a property named popupContent?
    const badges = feature.properties.categories.map((c) =>
      `<span class="badge badge-primary">${cats[c][1]}</span>`);

    let stars = '';
    for (let i = 0; i < parseFloat(feature.properties.rating, 10); i++) {
      stars += '<i class="text-warning fas fa-star"></i>';
    }
    layer.bindPopup(
      `
      <div class="d-flex justify-content-around align-items-center" style="min-width: 20rem;">
        <div class="mr-2">
          <img style="width: 5rem;" src='${feature.properties.image_url}'>
        </div>
        <div>
          <div class="h5">${feature.properties.name}</div>
          <div class="text-secondary mb-2">${badges}</div>
          <div>${stars} (${feature.properties.review_count})</div>
        </div>
      </div>`
    );
  }

  d3.csv('yelp_cats_boston.fixed.csv', (data) => {
    data.map(d => {
      const cAll = JSON.parse(d.categories);
      cAll.forEach(c => {
        if (!cats[c[1]]) {
          cats[c[1]] = [c[1], c[0], 0];
        }
        cats[c[1]][2] += 1;
      });
      d.categories = cAll.map(c => c[1]);
      return d;
    });

    catsByPop = _.sortBy(cats, c => c[2]).reverse();

    data = {
      features: data.map(d => {
        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [d.longitude, d.latitude],
          },
          properties: d
        };
      })
    };

    filterPinsEvent = () => {
      const filterPins = (ft) => {
        let contains = false;

        if (selectedFilters.length === 0) {
          contains = true;
        }
        selectedFilters.forEach((f) => {
          if (ft.properties.categories.includes(f)) {
            contains = true;
          }
        });
        return contains &&
          parseFloat(ft.properties.rating, 10) >= ratingFilter &&
          distance2([
              parseFloat(ft.properties.longitude, 10),
              parseFloat(ft.properties.latitude, 10)
            ], [mymap.getCenter().lng, mymap.getCenter().lat],
            distanceFilter);
      };

      const features = data.features.filter(filterPins);
      if (pinsLayer) {
        mymap.removeLayer(pinsLayer);
      }
      pinsLayer = L.geoJson(features, {
        onEachFeature: droppinBind
      });
      pinsLayer.addTo(mymap);
    };

    loadDone();
  });


  const bindFilters = () => {
    catsByPop.slice(0, 10).forEach(c => {
      $('.cat-filter-container').append(
        `
        <button type="button" class="btn btn-secondary m-2" id="cat-toggle-${c[0]}" style="width: 110px;">
          <img style="width: 68px;" src="icons/${c[0]}.png"></img>
          <div>${c[1]}</div>
        </button>`
      );
      $(`#cat-toggle-${c[0]}`).click((e) => {
        if (selectedFilters.includes(c[0])) {
          _.pull(selectedFilters, c[0]);
          $(`#cat-toggle-${c[0]}`).addClass('btn-secondary').removeClass(
            'btn-outline-warning');
        } else {
          selectedFilters.push(c[0]);
          $(`#cat-toggle-${c[0]}`).removeClass('btn-secondary')
            .addClass('btn-outline-warning');
        }
        filterPinsEvent();
        // update reset button
        if (selectedFilters.length > 0) {
          $('#cat-filter-reset').removeClass('disabled');
        } else {
          $('#cat-filter-reset').addClass('disabled');
        }
      });
    });

    $('#cat-filter-reset').click(() => {
      if (selectedFilters.length > 0) {
        // filter needs reset
        selectedFilters = [];
        filterPinsEvent();
        $('.cat-filter-container button').addClass(
          'btn-secondary').removeClass(
          'btn-outline-warning');
        $('#cat-filter-reset').addClass('disabled');
      }
    });

    $('.rating-filter-container input[type="radio"]').change(() => {
      if ($('#3stars').prop("checked")) {
        ratingFilter = 3;
      } else if ($('#3-5stars').prop("checked")) {
        ratingFilter = 3.5;
      } else if ($('#4stars').prop("checked")) {
        ratingFilter = 4;
      } else if ($('#4-5stars').prop("checked")) {
        ratingFilter = 4.5;
      }
      filterPinsEvent();
      // update reset button
      if (ratingFilter > 0) {
        $('#rating-filter-reset').removeClass('disabled');
      } else {
        $('#rating-filter-reset').addClass('disabled');
      }
    });

    $('#rating-filter-reset').click(() => {
      if (ratingFilter > 0) {
        // filter needs reset
        $('.rating-filter-container .btn').removeClass('active');
        ratingFilter = 0;
        filterPinsEvent();
        $('#rating-filter-reset').addClass('disabled');
      }
    });

    $('.distance-filter-container input[type="radio"]').change(() => {
      if ($('#1miles').prop("checked")) {
        distanceFilter = 1;
      } else if ($('#2miles').prop("checked")) {
        distanceFilter = 2;
      } else if ($('#4miles').prop("checked")) {
        distanceFilter = 4;
      } else if ($('#5miles').prop("checked")) {
        distanceFilter = 5;
      }
      filterPinsEvent();
      // update reset button
      if (distanceFilter < 1000) {
        $('#distance-filter-reset').removeClass('disabled');
      } else {
        $('#distance-filter-reset').addClass('disabled');
      }
    });

    $('#distance-filter-reset').click(() => {
      if (distanceFilter < 1000) {
        // filter needs reset
        $('.distance-filter-container .btn').removeClass('active');
        distanceFilter = 10000;
        filterPinsEvent();
        $('#distance-filter-reset').addClass('disabled');
      }
    });
  }

  const loadDone = () => {
    loaded += 1;
    if (loaded >= 2) {
      bindFilters();
      filterPinsEvent();
      filterStreetsEvent();
      mymap.on('zoomend', () => {
        filterPinsEvent();
        filterStreetsEvent();
      });
      mymap.on('moveend', () => {
        filterPinsEvent();
        filterStreetsEvent();
      });
    }
  }

});
