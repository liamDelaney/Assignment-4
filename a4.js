$(document).ready(() => {
  var mymap = L.map('leaflet').setView([42.35806, -71.06361], 13);
  L.tileLayer(
    'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}',
    {
      attribution:
        'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
      maxZoom: 18,
      id: 'mapbox.streets',
      accessToken: 'register a mapbox account and get a free token',
    },
  ).addTo(mymap);

  // Ke's token pk.eyJ1IjoibW9vZHNwYWNlIiwiYSI6ImNqZnJjanVkNzJxa2cyeG1rZDhlNWxkZGEifQ.p9EYGfNtWDHLd71gk8olvw
  var width = $('#leaflet')
      .parent()
      .width(),
    height = $('#leaflet')
      .parent()
      .height(),
    centered;

  // Defeaturesfine color scale
  var color = d3
    .scaleLinear()
    .domain([1, 20])
    .clamp(true)
    .range(['#fff', '#409A99']);

  var projection = d3
    .geoWinkel3()
    .center([-71.06361, 42.35806])
    .scale(1000000)
    .translate([width / 2, height / 2]);

  var path = d3.geoPath().projection(projection);

  // Set svg width & height
  var svg = d3
    .select('svg')
    .attr('width', width)
    .attr('height', height);

  var hoods = svg.append('svg:g').attr('id', 'hoods');

  d3.json('streets.geojson', function(data) {
    L.geoJSON(data.features).addTo(mymap);
  });

  d3.json('hoods.geojson', function(data) {
    L.geoJSON(data.features).addTo(mymap);
  });

  d3.csv('yelp_cats_boston.fixed.csv', function(data) {
    const points = data.map(d => {
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [d.longitude, d.latitude],
        },
        properties: d,
      };
    });
    L.geoJSON(points).addTo(mymap);
  });
});
