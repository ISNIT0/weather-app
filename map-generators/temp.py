import sys

import matplotlib
matplotlib.use('Agg')

import pygrib
import matplotlib.pyplot as plt
import matplotlib.colors as colors
from mpl_toolkits.basemap import Basemap
from mpl_toolkits.basemap import shiftgrid
import numpy as np

DPI=200
plt.figure(figsize=(2400.0/float(DPI),1220.0/float(DPI)))

#grib = 'cams_aod.grib' # Set the file name of your input GRIB file
#grib = '../download/gfs/2018083100/168/TMP_2maboveground.grib2'
grbs = pygrib.open(sys.argv[1])

grb = grbs.select()[0]
data = grb.values

# need to shift data grid longitudes from (0..360) to (-180..180)
lons = np.linspace(float(grb['longitudeOfFirstGridPointInDegrees']), \
float(grb['longitudeOfLastGridPointInDegrees']), int(grb['Ni']) )
lats = np.linspace(float(grb['latitudeOfFirstGridPointInDegrees']), \
float(grb['latitudeOfLastGridPointInDegrees']), int(grb['Nj']) )
data, lons = shiftgrid(180., data, lons, start=False)
grid_lon, grid_lat = np.meshgrid(lons, lats) #regularly spaced 2D grid

m = Basemap(projection='cyl', llcrnrlon=sys.argv[2], \
    urcrnrlon=sys.argv[3], llcrnrlat=sys.argv[4],urcrnrlat=sys.argv[5], \
    lat_ts=20, resolution='i')

x, y = m(grid_lon, grid_lat)

cs = m.pcolormesh(x,y,data,shading='flat',cmap=plt.cm.jet)

m.drawcoastlines()
#m.drawmapboundary()
#m.drawparallels(np.arange(-90.,120.,30.),labels=[1,0,0,0])
#m.drawmeridians(np.arange(-180.,180.,60.),labels=[0,0,0,1])

# plt.colorbar(cs,orientation='vertical', shrink=0.5)
#plt.title('CAMS AOD forecast') # Set the name of the variable to plot
plt.savefig(sys.argv[6], pad_inches=0, bbox_inches="tight", dpi=DPI) # Set the output file name
