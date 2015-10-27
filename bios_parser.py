'''
$ python bios_parser.py raw_bios.csv > deathrow.csv

Condense raw bios into a more web-friendly CSV file.

In particular make it smaller and exclude any fields that are not 
actually used in the visualization.

JN 2013
'''

from bios_getter import headers
from collections import defaultdict
from sys import argv, stderr, stdout, exit
import csv
import sentiment


clf = sentiment.train()

def classify_positive(n):
    if 'declined to make' in n or len(n.strip())<1:
        return "N/A"
    return sentiment.classify(n, clf)['pos']


def normalize_name(n):
    return n.title().strip();


headers_map = {
    'Execution #' : ['Execution #'],
    'Date of execution' : ['Execution Date'],
    'Age (when executed)' : ['Age when Executed'],
    'First Name' : ['First Name'],
    'Last Name' : ['Last Name'],
    'TDCJ Number' : ['Prisoner'],
    'Age (when received)' : ['Age of Incarceration'],
    'Education Level (highest grade completed)' : ['Education'],
    'Race' : ['Race', normalize_name],
    'Gender' : ['Gender', normalize_name],
    'Prior Occupation' : ['Occupation'],
    'statement' : [['Statement'], ['Sentiment', classify_positive]],
    'Link to Offender Information' : ['Source of Bio'],
    'Link to Last Statement' : ['Source of Statement']
}


if __name__=='__main__':
    # Main loop

    print >>stderr, "Starting ..."

    if len(argv)!=2:
        # Check arguments, make sure raw file is given
        print >>stderr, "Wrong number of arguments."
        print >>stderr, __doc__
        exit(1)

    with open(argv[1], 'r') as fh:
        print >>stderr, "Opening files ..."
        reader = csv.reader(fh)
        writer = csv.writer(stdout)

        good_cells = defaultdict(int)
        norm = defaultdict(list)

        print >>stderr, "Filtering raw data ...",
        for entry in reader:
            new_entry = []
            if not good_cells:
                # Read header
                for i, cell in enumerate(entry):
                    if cell in headers_map:
                        if type(headers_map[cell][0]) is not list:
                            headers_map[cell] = [headers_map[cell]]

                        for newcol in headers_map[cell]:
                            good_cells[i]+=1
                            new_entry.append(newcol[0])

                            if len(newcol)==2:
                                # Remember normalization function to 
                                norm[i].append(newcol[1])
                            else:
                                norm[i].append(None)
            else:
                # Read entry, whitelisting cells in good_cells
                for i, cell in enumerate(entry):
                    #print >>stderr, good_cells[i]
                    #print >>stderr, norm[i]
                    for x in range(good_cells[i]):
                        nc = cell
                        
                        if norm[i][x] is not None:
                            # Normalize value
                            nc = norm[i][x](nc)

                        new_entry.append(nc)

            # Write CSV line to stdout
            writer.writerow(new_entry)
        print >>stderr, "Done."

    print >>stderr, "Success!"
