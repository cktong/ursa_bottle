import json
import pandas as pd
import numpy as np

def get_buildings():

	base = 'http://paris.urbansim.org/data/'
	building_types = pd.read_csv(base+'building_types.csv',index_col='building_type_id')
	buildings = pd.read_csv(base+'buildings.csv',index_col='building_id')

	iv = np.round(buildings.groupby('building_type_id').improvement_value.sum() / 1000000000,2)
	iv2 = np.round(buildings.groupby('building_type_id').improvement_value.mean() / 1000000,2)
	out = pd.DataFrame({"iv_sum":iv,"iv_mean":iv2}).join(building_types)

	# out.set_index('building_type_name', inplace=True, drop=True, append=False)

	d = [ 
	    dict([
	        (colname, row[i]) 
	        for i,colname in enumerate(out.columns)
	    ])
	    for row in out.values
	]

	return json.dumps(d)

	# dic=out.to_dict()
	# dic["iv_mean_max"]=out.iv_mean.max()
	# dic["iv_sum_max"]=out.iv_sum.max()


	# with open('data.json', 'w') as outfile:
	#   json.dump(d, outfile)


	# return dic