import csv
import ast

# use python csvhelper.py to create csv file

infile = "yelp_cats_boston.fixed.csv"
outfile = "help.csv"

with open(infile, encoding='utf-8') as f, open(outfile, 'w') as o:
	reader = csv.reader(f)
	writer = csv.writer(o, delimiter=',') # adjust as necessary
	for row in reader:
		# print('hi'+row[7])
		if row[7] != "location":
			row7 = row[7].replace('"', "'")
			# print(row7)
			row7dict = eval(row7)
			if row7dict['city'].lower() == "boston":
				writer.writerow(row)
		else:
			writer.writerow(row)