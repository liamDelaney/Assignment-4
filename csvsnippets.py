import csv
from nltk.corpus import stopwords


# use python csvsnippets.py to do some text mining

cachedStopWords = stopwords.words("english")


infile = "yelp_cats_boston.fixed.csv"
outfile = "help3.csv"

with open(infile, encoding='utf-8') as f, open(outfile, 'w') as o:
	reader = csv.reader(f)
	writer = csv.writer(o, delimiter=',') # adjust as necessary
	for row in reader:
		# print('hi'+row[7])
		if row[6] != "snippet_text":
			# row6 = row[6].replace('"', "'")
			# print(row7)
			# row6string = eval(row4)
			row6string = row[6]

			# do some text editing and remove stop words


			row[6] = row6string
			writer.writerow(row)
		else:
			writer.writerow(row)

