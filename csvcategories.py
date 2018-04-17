import csv
import ast

# use python csvcategories.py to turn the categories column from array to list

infile = "yelp_cats_boston.fixed.csv"
outfile = "help2.csv"

with open(infile, encoding='utf-8') as f, open(outfile, 'w') as o:
	reader = csv.reader(f)
	writer = csv.writer(o, delimiter=',') # adjust as necessary
	for row in reader:
		# print('hi'+row[7])
		if row[4] != "categories":
			row4 = row[4].replace('"', "'")
			# print(row7)
			row4array = eval(row4)
			row4string = ""
			for arr in row4array:
				row4string = row4string + arr[0] + ', '
			row4string = row4string[:-2]
			row[4] = row4string
			writer.writerow(row)
		else:
			writer.writerow(row)