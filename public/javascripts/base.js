
var autorefresh = false;
var qtable = null;


function getTimeDelta (ts) {
  if ((ts == null) || (ts == undefined)) {
    return '-';
  }
  
  var delta = ts - new Date ().getTime ();
  var positive = true;
  
  if (delta < 0) {
    positive = false;
    delta = -delta;
  }
  
  var dt_d = Math.floor (delta / (24*60*60*1000));
  delta = delta - (dt_d * 24*60*60*1000);
  
  var dt_h = Math.floor (delta / (60*60*1000));
  delta = delta - (dt_h * 60*60*1000);
  
  var dt_m = Math.floor (delta / (60*1000));
  delta = delta - (dt_m * 60*1000);
  
  var dt_s = delta / 1000;
  
  var res = positive ? '' : '- ';
  
  if (dt_d > 0) res = res + dt_d + 'd ';
  if (dt_h > 0) res = res + dt_h + 'h ';
  if (dt_m > 0) res = res + dt_m + 'm ';
  res = res + dt_s + 's';
  
  return res;
}


/////////////////////////////////////////
function refresh (){
/////////////////////////////////////////
  qtable.ajax.reload( null, false );
}


/////////////////////////////////////////
$(function() {
/////////////////////////////////////////
  console.log ('ready!');
  
  $.fn.dataTable.ext.errMode = 'none';
  
  $('#refresh-btn').click(function( eventObject ) {
    console.log ('refresh-btn clicked');
    refresh ();
  });
  
  $('#qtable')
  .on ('error.dt', function ( e, settings, techNote, message ) {
    $('#error-text').html (message);
    $('#error-panel').show ();
  })
  .on ('xhr.dt', function (e, settings, json, xhr ) {
    if (xhr.status != 200) {
      var xhr_txt = 'readyState: ' + xhr.readyState + 
      ' responseJSON: ' + xhr.responseJSON + 
      ' status:  ' + xhr.status +
      ' statusText: ' + xhr.statusText;
      
      $('#error-text').html ('Error while obtaining data from server. Response is [' + xhr_txt + ']');
      $('#error-panel').show ();
    }
  })
  .on('preXhr.dt', function (e, settings, data) {
    $('#error-panel').hide ();
    $('#error-text').html = '';
  } )
  
  qtable = $('#qtable') .DataTable({
    processing: true,
    select: 'single',
    ajax: '/q?array=1',
    columns: [
      {data: 'id'},
      {data: 'stats.put', defaultContent: '-'},
      {data: 'stats.get', defaultContent: '-'},
      {data: 'size',      defaultContent: '0'},
      {data: 'totalSize', defaultContent: '0'},
      {data: 'schedSize', defaultContent: '0'},
      {data: 'next_mature_t', render: function ( data, type, full, meta ) {
        return data ? getTimeDelta (data) : '-';
      }},
    ]
  });
  
  qtable.on ('select', function ( e, dt, type, indexes ) {
    console.log ('select: ',e, dt, type, indexes )
    if ( type === 'row' ) {
      //      var data = table.rows( indexes ).data().pluck( 'id' );
      
      // do something with the ID of the selected items
    }
  });
  
  autoRefresh();
});
