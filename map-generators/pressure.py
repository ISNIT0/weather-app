from __future__ import (absolute_import, division, print_function)

import sys

import matplotlib
matplotlib.use('Agg')

"""
plot H's and L's on a sea-level pressure map
(uses scipy.ndimage.filters and netcdf4-python)
"""

import sys

import matplotlib
matplotlib.use('Agg')

import pygrib
import matplotlib.pyplot as plt
import matplotlib.colors as colors
from mpl_toolkits.basemap import Basemap, addcyclic
from mpl_toolkits.basemap import shiftgrid
import numpy as np
from datetime import datetime
from scipy.ndimage.filters import minimum_filter, maximum_filter

def extrema(mat,mode='wrap',window=10):
    """find the indices of local extrema (min and max)
    in the input array."""
    mn = minimum_filter(mat, size=window, mode=mode)
    mx = maximum_filter(mat, size=window, mode=mode)
    # (mat == mx) true if pixel is equal to the local max
    # (mat == mn) true if pixel is equal to the local in
    # Return the indices of the maxima, minima
    return np.nonzero(mat == mn), np.nonzero(mat == mx)

DPI=200
plt.figure(figsize=(2400.0/float(DPI),1220.0/float(DPI)))

#grib = 'cams_aod.grib' # Set the file name of your input GRIB file
#grib = '../download/gfs/2018083100/168/TMP_2maboveground.grib2'
grbs = pygrib.open(sys.argv[1])

grbs.seek(0)
for grb in grbs:
    print(grb)

grb = grbs.select(name='Surface pressure')[0]
data = grb.values


lons = np.linspace(float(grb['longitudeOfFirstGridPointInDegrees']), \
float(grb['longitudeOfLastGridPointInDegrees']), int(grb['Ni']) )
lats = np.linspace(float(grb['latitudeOfFirstGridPointInDegrees']), \
float(grb['latitudeOfLastGridPointInDegrees']), int(grb['Nj']) )
data, lons = shiftgrid(180., data, lons, start=False)
grid_lon, grid_lat = np.meshgrid(lons, lats) #regularly spaced 2D grid

nlats = len(lats)
nlons = len(lons)
# read prmsl, convert to hPa (mb).
prmsl = 0.01*data

# the window parameter controls the number of highs and lows detected.
# (higher value, fewer highs and lows)
local_min, local_max = extrema(prmsl, mode='wrap', window=50)
# create Basemap instance.
m = Basemap(projection='cyl', llcrnrlon=sys.argv[2], \
    urcrnrlon=sys.argv[3], llcrnrlat=sys.argv[4],urcrnrlat=sys.argv[5], \
    lat_ts=20, resolution='i')
# add wrap-around point in longitude.
prmsl, lons = addcyclic(prmsl, lons)
# contour levels
clevs = np.arange(900,1100.,5.)
# find x,y of map projection grid.
lons, lats = np.meshgrid(lons, lats)
x, y = m(lons, lats)
# create figure.
fig=plt.figure(figsize=(8,4.5))
ax = fig.add_axes([0.05,0.05,0.9,0.85])
cs = m.contour(x,y,prmsl,clevs,colors='k',linewidths=1.)
m.drawcoastlines(linewidth=1.25)
m.drawlsmask(land_color=(0.25,0.5,0,1), ocean_color=(0.9,0.9,1,1))
m.fillcontinents(color=(0.25,0.5,0,1))
# m.drawparallels(np.arange(-80,81,20),labels=[1,1,0,0])
# m.drawmeridians(np.arange(0,360,60),labels=[0,0,0,1])
xlows = x[local_min]; xhighs = x[local_max]
ylows = y[local_min]; yhighs = y[local_max]
lowvals = prmsl[local_min]; highvals = prmsl[local_max]

# plot lows as blue L's, with min pressure value underneath.

xyplotted = []

# don't plot if there is already a L or H within dmin meters.

yoffset = 0.022*(m.ymax-m.ymin)
dmin = yoffset
for x,y,p in zip(xlows, ylows, lowvals):
    if x < m.xmax and x > m.xmin and y < m.ymax and y > m.ymin:
        dist = [np.sqrt((x-x0)**2+(y-y0)**2) for x0,y0 in xyplotted]
        if not dist or min(dist) > dmin:
            plt.text(x,y,'L',fontsize=14,fontweight='bold',
                    ha='center',va='center',color='b')
            plt.text(x,y-yoffset,repr(int(p)),fontsize=9,
                    ha='center',va='top',color='b',
                    bbox = dict(boxstyle="square",ec='None',fc=(1,1,1,0.5)))
            xyplotted.append((x,y))
# plot highs as red H's, with max pressure value underneath.
xyplotted = []
for x,y,p in zip(xhighs, yhighs, highvals):
    if x < m.xmax and x > m.xmin and y < m.ymax and y > m.ymin:
        dist = [np.sqrt((x-x0)**2+(y-y0)**2) for x0,y0 in xyplotted]
        if not dist or min(dist) > dmin:
            plt.text(x,y,'H',fontsize=14,fontweight='bold',
                    ha='center',va='center',color='r')
            plt.text(x,y-yoffset,repr(int(p)),fontsize=9,
                    ha='center',va='top',color='r',
                    bbox = dict(boxstyle="square",ec='None',fc=(1,1,1,0.5)))
            xyplotted.append((x,y))

plt.savefig(sys.argv[6], pad_inches=0, bbox_inches="tight", dpi=DPI) # Set the output file name