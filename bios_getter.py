#-*-coding: utf8-*-
'''
$ python bios_getter.py

Get and parse death penalty bio pages
from Texas Dept of Criminal Justice website.

Writes data to stdout as CSV, so pipe it into desired location.

Joe Nudell, 2013
'''

from bs4 import BeautifulSoup as bs
from nameparser import HumanName
from sys import argv, stderr, stdout, exit
from urlparse import urljoin
import os
import re
import urllib
import urllib2
import csv


source_url = "http://www.tdcj.state.tx.us/death_row/dr_executed_offenders.html"

headers = [
    'Date of execution',
    'Execution #',
    'Age (when executed)',
    'First Name',
    'Middle Name',
    'Last Name',
    'Name Suffix',
    'TDCJ Number',
    'Date of Birth',
    'Date Received',
    'Age (when received)',
    'Education Level (highest grade completed)',
    'Date of Offense',
    'Age (at time of offense)',
    'County',
    'Race',
    'Gender',
    'Hair Color',
    'Height',
    'Weight',
    'Eye Color',
    'Native County',
    'Native State',
    'Prior Occupation',
    'Prior Prison Record',
    'Summary of Incident',
    'Co-Defendants',
    'Race and Gender of Victim',
    'Headshot (base-64)',
    'statement',
    'Link to Offender Information',
    'Link to Last Statement'
]




if __name__=='__main__':
    # Get the main index page
    print >>stderr, "Scraping Texas Dept. of Criminal Justice - Death Row Info"
    print >>stderr, "\n\n"


    print >>stderr, "Downloading main index ... ",
    uh_main = urllib2.urlopen(source_url)
    soup_index = bs(uh_main.read())
    index_table = soup_index.find('table')
    print >>stderr, "Done.\n"
    print >>stderr, "Beginning scraping.\n"


    # Find all rows on the page, skip first because it's headers
    rows = index_table.find_all('tr')[1:]
    max_ = len(rows)

    out_file = csv.writer(stdout)

    out_file.writerow(headers)

    for i, row in enumerate(rows):
        # Iterate over table rows, store info, grab links, download links
        print >>stderr, "Reading row", i+1, "out of", max_, "..."

        entry = []

        cells = row.find_all('td')

        # First - date of execution. In cell #7
        entry.append(cells[7].text.encode('utf8'))

        # Second - Execution #. Cell #0.
        entry.append(cells[0].text.encode('utf8'))

        # Third - Age when executed. In Cell #6.
        entry.append(cells[6].text.encode('utf8'))

        # Get links
        bio_link = urljoin(source_url, cells[1].find('a')['href'])
        statement_link = urljoin(source_url, cells[2].find('a')['href'])
        
        last_name = cells[3].text.encode('utf8')
        first_name = cells[4].text.encode('utf8')
        _name = first_name + " " + last_name

        # --- Download BIO link ---
        print >>stderr, "  Downloading bio for", _name, " ...",

        yay_have_data = False

        if bio_link.endswith('.html'):
            # Bio available in HTML! Parse it.

            uh = urllib2.urlopen(bio_link)
            soup_bio = bs(uh.read())

            print >>stderr, "Done."
            print >>stderr, "    Parsing bio ...", 

            main_table = soup_bio.find('table',
                attrs={'class':'tabledata_deathrow_table'})

            if main_table:
                # Data is available!
                yay_have_data = True

                line_tmp = [tr.find('td',
                            attrs={'class':'tabledata_align_left_deathrow'})\
                                .text.encode('utf8')
                            for tr in main_table.find_all('tr')]
                name = HumanName(line_tmp[0])
                line = [name.first, name.middle, name.last, name.suffix] \
                        + line_tmp[1:]

                try:
                    image_link = urljoin(bio_link,
                                         main_table.find('img')['src'])
                except Exception as e:
                    print >>stderr, "[Error: image not available.", str(e),"]"
                    image_link = None

                supp_info = []
                for p in soup_bio.find_all('p')[1:]:
                    # This one is a problematic / ill-formed field.
                    try:
                        supp_info.append(p.find('span')\
                                 .find_next('br').next_sibling.encode('utf8'))
                    except Exception as e:
                        print >>stderr, "[Error:", str(e), ", p=", str(p), "]",
                        supp_info.append("")

                while len(supp_info)<5:
                    # Make sure supplemental info is five cells in length
                    supp_info.append("Not Available")

                line += supp_info

                if image_link:
                    # download image
                    print >>stderr, "fetching headshot ...",
                    uhimg = urllib2.urlopen(image_link)
                    img = urllib.quote(uhimg.read().encode('base64'))
                else:
                    img = "Not Available"

                line.append(img)

                entry += line
                print >>stderr, "Done."

        if not yay_have_data:
            # Frown, no data
            # Get what's known from index page
            print >>stderr, "Can't get bio. Falling back to index info ...",

            entry += [first_name,"",last_name,"",cells[5].text.encode('utf8')]
            entry += ["Not Available"]*6
            entry += [c.text.encode('utf8') for c in [cells[9], cells[8]]]
            entry += ["Not Available"]*13

            print >>stderr, "Done."


        # -- Download STATEMENT link ---
        print >>stderr, "  Downloading statement ...",
        uh = urllib2.urlopen(statement_link)
        soup_statement = bs(uh.read())
        print >>stderr, "Done."

        print >>stderr, "    Parsing statement ...",

        _title = soup_statement.find('p',text=re.compile(".*statement.*",re.I))
        statement = "Unknown"
        if _title:
            s = _title.find_next('p')
            if s:
                statement = s.text.encode('utf8')

        entry.append(statement)

        print >>stderr, "Done."

        print >>stderr, "  Printing info ...",
        entry = [c.strip() for c in entry]

        entry += [bio_link, statement_link]

        out_file.writerow(entry)
        print >>stderr, "All done!"



