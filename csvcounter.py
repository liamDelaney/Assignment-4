import csv
import ast

# use python csvhelper.py to create csv file

infile = "yelp_cats_boston.fixed.csv"
outfile = "filteroptions.txt"

with open(infile, encoding='utf-8') as f, open(outfile, 'w') as o:
	reader = csv.reader(f)
	writer = csv.writer(o, delimiter=',') # adjust as necessary
	potato = []
	for row in reader:
		# print('hi'+row[7])
		if row[11] != "search_category":
			potato.append(row[11])

	potato_set = set(potato)
	print(potato_set)
	for element in potato_set:
		writer.writerow([element])
