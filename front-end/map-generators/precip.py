from __future__ import (absolute_import, division, print_function)

import sys

import matplotlib
matplotlib.use('Agg')

import pygrib
import matplotlib.pyplot as plt
import matplotlib.colors as colors
from mpl_toolkits.basemap import Basemap, cm
from mpl_toolkits.basemap import shiftgrid
import numpy as np
from matplotlib import rcParams
import copy

# plot rainfall from NWS using special precipitation
# colormap used by the NWS, and included in basemap.

grbs = pygrib.open(sys.argv[1])

grbs.seek(0)
for grb in grbs:
    print(grb)

grb = grbs.select(name='Total Precipitation')[0]
data = grb.values


DPI=200
plt.figure(figsize=(2400.0/float(DPI),1220.0/float(DPI)))

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

ny = data.shape[0]; nx = data.shape[1]
lons, lats = m.makegrid(nx, ny) # get lat/lons of ny by nx evenly space grid.
x, y = m(lons, lats) # compute map proj coordinates.
# draw filled contours.

clevs = [0,1,2.5,5,7.5,10,15,20,30,40,50,70,100,150,200,250,300,400,500,600,750]
m.contourf(x,y,data,clevs,cmap=cm.s3pcpn)


m.drawcoastlines(linewidth=1.25)
# m.drawlsmask(land_color=(0.25,0.5,0,1), ocean_color=(0.9,0.9,1,1))
# m.fillcontinents(color=(0.25,0.5,0,1))

plt.savefig(sys.argv[6], pad_inches=0, bbox_inches="tight", dpi=DPI) # Set the output file name