#-*-coding:utf8-*-

import nltk.classify.util
from nltk.classify import NaiveBayesClassifier
from nltk.corpus import movie_reviews
from nltk.tokenize import wordpunct_tokenize as tokenizer


def word_feats(words):
    return dict([(word, True) for word in words])


def train(test=False):

    negids = movie_reviews.fileids('neg')
    posids = movie_reviews.fileids('pos')


    negfeats = [(word_feats(movie_reviews.words(fileids=[f])), 'neg') for f in negids]
    posfeats = [(word_feats(movie_reviews.words(fileids=[f])), 'pos') for f in posids]


    if(test):
        negcutoff = len(negfeats)*3/4
        poscutoff = len(posfeats)*3/4

        trainfeats = negfeats[:negcutoff] + posfeats[:poscutoff]
        testfeats = negfeats[negcutoff:] + posfeats[poscutoff:]

        print 'train on %d instances, test on %d instances' % (len(trainfeats), len(testfeats))

        classifier = NaiveBayesClassifier.train(trainfeats)
        print 'accuracy:', nltk.classify.util.accuracy(classifier, testfeats)

        classifier.show_most_informative_features()

    else:
        return NaiveBayesClassifier.train(negfeats+posfeats)



def classify(text, clf, prob=True):
    words = tokenizer(text)

    feats = dict(zip(words, [True for word in words]))

    if prob:
        c = clf.prob_classify(feats)
        return {'pos': c.prob('pos'), 'neg': c.prob('neg')}
    else:
        return clf.classify(feats)







