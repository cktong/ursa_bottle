App = Ember.Application.create({});

App.Host = "http://paris.urbansim.org:5984";

App.ApplicationAdapter = EmberCouchDBKit.DocumentAdapter.extend({db: 'charts', host: App.Host});
App.ApplicationSerializer = EmberCouchDBKit.DocumentSerializer.extend();

App.Chart = DS.Model.extend({
    name: DS.attr('string'),
    table: DS.attr('string'),
    desc: DS.attr('string'),
    filter: DS.attr('string'),
    metric: DS.attr('string'),
    limit: DS.attr('string'),
    sort: DS.attr('boolean'),
    groupby: DS.attr('string'),
    port: DS.attr('number'),
    jointoparcels: DS.attr('boolean'),
    orderdesc: DS.attr('boolean')
});

App.Router.map(function() {
    this.resource('display');
    this.resource('charts', function() {
        this.resource('chart', { path: ':chart_id' });
    });
});

App.ChartsRoute = Ember.Route.extend({
    model: function() {
        return this.store.find('chart');
    }
});

App.ChartsController = Ember.ObjectController.extend({
    newChart: function() {
        var chart = this.store.createRecord('chart',{desc:"New chart"});
        chart.save().then(function() {
                growl("success","Success","New record created")
            }, function() {
                growl("error","Error","Record create failed")
            }
        )
    }
});

App.DisplayController = Em.ArrayController.extend({
    filteredContent: Ember.computed('content', function() {
        return this.get('model').filterProperty('port', 8764);
    })
});

App.DisplayRoute = Ember.Route.extend({
    model: function() {
        return this.store.find('chart');
    }
});

App.ChartsIndexRoute = Ember.Route.extend({
    model: function(params) {
        return this.store.find('chart');
    }
});

App.ChartsIndexController = Ember.ObjectController.extend({
    deleteChart: function(id) {
        console.log(id);
        this.get('store').find('chart', id).then(function(rec){
            rec.deleteRecord();
            rec.save().then(function() {
                    growl("success","Success","Record deleted")
                }, function() {
                    growl("error","Error","Record delete failed")
                }
            )
        });
    }
});

App.ChartRoute = Ember.Route.extend({
    model: function(params) {
        return this.store.find('chart', params.chart_id);
    }
});

function growl(type,title,text,sticky) {
    sticky = sticky || false;
    $.msgGrowl ({type: type, title: title, text: text, sticky: sticky});
}

App.ChartController = Ember.ObjectController.extend({
    isEditing: false,

    edit: function() {
        this.set('isEditing', true);
    },

    saveLocally: function(id) {
        this.set('isEditing', false);
    },

    saveToDB: function(id) {
        this.set('isEditing', false);
        this.get('store').find('chart',id).then(function (rec) {
            rec.save().then(function (rec) {
                growl("success","Success","Database update successful.");
            },function() {
                growl("error","Error","Database update failed.");
            });
        }, function() {
            growl("error","Error","Database fetch failed.");
        });
    }
});

App.MyChartView = Ember.View.extend({
    tagName: 'svg',
    gno: 1,
    store: null,
    didInsertElement: function() {
        var gno = this.get('gno');

        var id = this.$().attr('id');
        $('#'+id)[0].setAttribute("height",350);
        var cls = this.get('parentView').get("columnno") || 1;

        var scenario = null;
        if(cls && cls != 1) scenario = ["baseline","scen0_sched_stations_empboost","low_impact_lowimpact_base"][cls-1];

        var chart = this.get('store').find('chart',gno).then(function (chart) {
            query_and_graph(chart,id,scenario);
        }, function() {
            growl("error","Error","Database fetch failed.");
        });
    }.observes('gno')
});

App.MyColumnView = Ember.View.extend({
    columnno: 1,
    templateName: "dthree-chart"
});

function query_and_graph(spec,tagelement,scenario) {
    var req = spec.getProperties(['table','filter','metric','groupby','sort','orderdesc','limit','jointoparcels']);
    var port = spec.get('port');
    var groupby = spec.get('groupby');
    var desc = spec.get('desc');
    if(scenario && port == 8764) {
        newtable = scenario+'_'+req['table'].split('_').pop()
        req['table'] = newtable;
    }

    $.ajax({
        url: "http://paris.urbansim.org:"+port+"/query?callback=?&json=" + JSON.stringify(req),
        dataType: "jsonp",
        contentType: "application/json;charset=utf-8",
        timeout: 10000,
        success: function (data) {
            if ('error' in data) {
                growl("error","Chart query failed",data['error'],true);
                return;
            }

            nv.addGraph(function () {
                var chart = nv.models.discreteBarChart()
                    .x(function (d) {
                        return d.label
                    })
                    .y(function (d) {
                        return d.value
                    })
                    .margin({top: 10, right: 10, bottom: 40 , left: 80})
                    //.staggerLabels(true)
                    //.tooltips(false)
                    //.showValues(true);
                chart.xAxis.axisLabel(groupby);
                chart.yAxis.axisLabel(desc + " (in thousands)");

                var outrecs = [];
                var inrecs = data['records'];
                for (var i = 0; i < inrecs.length; i++)
                    outrecs.push({'label': inrecs[i][0], 'value': inrecs[i][1]/1000.0});
                spec = [
                    {key: "Agedist", values: outrecs}
                ];
                console.log(spec);
                d3.select("#"+tagelement) //'#chart'+chartnum+' svg')
                    .datum(spec)
                    .transition().duration(500)
                    .call(chart);

                return chart;
            });
        },
        error: function (data, status) {
            growl("error","Ajax query failed",status);
            console.log(JSON.stringify(req));
        }
    });
    return false;
}