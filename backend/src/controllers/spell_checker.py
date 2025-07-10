import sys
import json
from symspellpy import SymSpell, Verbosity

def load_symspell():
    """Initialize and load the SymSpell dictionary."""
    sym_spell = SymSpell(max_dictionary_edit_distance=2, prefix_length=7)
    sym_spell.load_dictionary("frequency_dictionary_en_82_765.txt", term_index=0, count_index=1)
    return sym_spell

def spell_check(sentence):
    """Check spelling for each word in a sentence and return corrections."""
    sym_spell = load_symspell()
    words = sentence.split()  # Split sentence into words
    corrections = {}

    for word in words:
        suggestions = sym_spell.lookup(word, Verbosity.CLOSEST, max_edit_distance=2)
        if suggestions and suggestions[0].term.lower() != word.lower():
            corrections[word] = suggestions[0].term  # Store corrected word

    return corrections  # Return a dictionary of {incorrect_word: corrected_word}


corrected_words = spell_check(input_sentence)
print(json.dumps(corrected_words))  # Output JSON-formatted corrections
