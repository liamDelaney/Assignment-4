const distance2 = (p, q, dist) => {
  return distance(p[1], p[0], q[1], q[0], 'M') <= dist;
}

let cats = {};

const loadDetail = (ft) => {
  $('.detail').fadeIn();
  $('.detail .avatar').attr('src', ft.properties.image_url);
  $('.detail .name').html(
    `<a class="text-light" href="${ft.properties.url}">${ft.properties.name}</a>`
  );
  const address = JSON.parse(ft.properties.location).display_address.join(
    ', ');
  const mapsLink =
    `<a class="text-light" href="https://www.google.com/maps/@${ft.properties.latitude},${ft.properties.longitude},18z">${address}</a>`;
  $('.detail .location').html('<i class="fas fa-map-marker mr-1"></i>' +
    mapsLink);
  $('.detail .categories').html(ft.properties.categories.slice(0, 4).map((c) =>
    `<span style="border-radius: 15px; border: 1px dashed;" class="border-light p-1 pl-2 pr-2 m-2 h6">${cats[c][1]}</span>`
  ).join(''));
}

$(document).ready(() => {
  var mymap = new L.map('leaflet').setView([42.35806, -71.06361], 13);
  L.tileLayer(
    'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
      attribution: '<a href="javascript:void(0)" data-toggle="modal" data-target="#credit">Open Source Notices</a> | Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
      maxZoom: 18,
      id: 'mapbox.streets',
      accessToken: 'pk.eyJ1IjoibW9vZHNwYWNlIiwiYSI6ImNqZnJjanVkNzJxa2cyeG1rZDhlNWxkZGEifQ.p9EYGfNtWDHLd71gk8olvw',
    },
  ).addTo(mymap);

  let loaded = 0;

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
        let mapContains = false;
        ft.geometry.coordinates.forEach((cd) => {
          if (d3.polygonContains([
              [ne.lng, ne.lat],
              [ne.lng, sw.lat],
              [sw.lng, sw.lat],
              [sw.lng, ne.lat]
            ], cd)) {
            mapContains = true;
          }
        });
        return mapContains;
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

  const bindPin = (feature, layer) => {
    // Popups
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
          <img style="width: 5rem; border-radius: 5px;" src='${feature.properties.image_url}'>
        </div>
        <div>
          <div class="h5">${feature.properties.name}</div>
          <div class="text-secondary mb-2">${badges}</div>
          <div>${stars} (${feature.properties.review_count}) <a href="${feature.properties.url}" target="_blank"><img class="icon" src="icons/yelp-icon2.png"></a></div>
        </div>
      </div>`
    );

    // OnClick
    layer.on('click', function(e) {
      loadDetail(e.target.feature);
    });
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
      const ne = mymap.getBounds()._northEast;
      const sw = mymap.getBounds()._southWest;
      const filterPins = (ft) => {
        const mapContains = d3.polygonContains([
          [ne.lng, ne.lat],
          [ne.lng, sw.lat],
          [sw.lng, sw.lat],
          [sw.lng, ne.lat]
        ], [ft.properties.longitude, ft.properties.latitude]);
        let catContains = false;

        if (selectedFilters.length === 0) {
          catContains = true;
        }
        selectedFilters.forEach((f) => {
          if (ft.properties.categories.includes(f)) {
            catContains = true;
          }
        });
        return mapContains && catContains &&
          parseFloat(ft.properties.rating, 10) >= ratingFilter &&
          distance2([
              parseFloat(ft.properties.longitude, 10),
              parseFloat(ft.properties.latitude, 10)
            ], [mymap.getCenter().lng, mymap.getCenter().lat],
            distanceFilter);
      };

      let features = data.features.filter(filterPins);
      let features2;
      // to get a less cluttered view
      if (mymap.getZoom() < 18 && features.length > 30) {
        features2 = _.sampleSize(features, features.length * 0.96);
      }
      if (pinsLayer) {
        mymap.removeLayer(pinsLayer);
      }

      const icon = new L.Icon({
        iconUrl: 'icons/pin.png',
        iconRetinaUrl: 'icons/pin-2x.png',
        iconSize: [25, 40],
        iconAnchor: [12, 40],
        popupAnchor: [1, -34],
        shadowUrl: 'icons/pin-shadow.png',
        shadowSize: [40, 40]
      });
      const icon2 = new L.Icon({
        iconUrl: 'icons/smallpin.png',
        iconRetinaUrl: 'icons/smallpin-2x.png',
        iconSize: [10, 10],
        iconAnchor: [5, 5],
        popupAnchor: [1, -1],
        shadowUrl: 'icons/pin-shadow.png',
        shadowSize: [10, 10]
      });
      pinsLayer = L.geoJson(features, {
        pointToLayer: (ft, latlng) => {
          return L.marker(latlng, {
            icon: features2 && features2.includes(ft) ?
              icon2 : icon
          });
        },
        onEachFeature: bindPin
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
