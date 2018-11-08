import sys

from scipy.io import netcdf
import matplotlib as mpl
mpl.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import numpy as np
def head(x): return x[:10]; end


inFile = sys.argv[1]
parameter = sys.argv[2]
outFile = sys.argv[3]

print "Using data from grib file:", inFile

# data = netcdf.netcdf_file("./netcdf/gfs." + runId + '/' + originalFile + ".land.netcdf")

# surface = data.variables['LAND_surface']
# surface_bitmap = surface.data[0] * 255

fig = plt.figure(figsize=(12, 6))

if parameter == "TMP_2maboveground":
    temp_data = netcdf.netcdf_file(inFile).variables["TMP_2maboveground"]

    temp_2m_above_ground_deg_C = temp_data[0] - 273.15

    # plt.contour(surface_bitmap, origin='lower', colors="black", aspect='auto', linewidths=0.1)
    plt.imshow(temp_2m_above_ground_deg_C, origin='lower')



plt.colorbar();

plt.savefig(outFile);