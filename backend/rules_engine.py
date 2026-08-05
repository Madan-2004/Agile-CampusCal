"""
Hard-coded classification: evaluates Gmail-style filter queries in Python.

Supports exactly the operator subset used by gmail_filters_import.xml:
    from:  to:  cc:  subject:"..."   negation with -   OR   implicit AND   ( )
Anything else is treated as a plain substring match on the whole message.

Grammar
    expr    := or_expr
    or_expr := and_expr ("OR" and_expr)*
    and_expr:= unary+                       (juxtaposition = AND)
    unary   := "-" unary | primary
    primary := "(" expr ")" | term
    term    := field ":" value | bare_word
"""
import json
import os
import re

RULES_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "gmail_rules.json")

FIELDS = ("from", "to", "cc", "subject", "list", "deliveredto", "label")


# ────────────────────────────── tokenizer ──────────────────────────────
TOKEN_RE = re.compile(
    r"""
    \s*(?:
        (?P<lparen>\()
      | (?P<rparen>\))
      | (?P<neg>-)(?=\S)
      | (?P<or>\bOR\b)
      | (?P<field>[A-Za-z]+):(?P<value>"[^"]*"|[^\s()]+)
      | (?P<word>"[^"]*"|[^\s()]+)
    )
    """,
    re.VERBOSE,
)


def _tokenize(q: str):
    tokens, pos = [], 0
    while pos < len(q):
        m = TOKEN_RE.match(q, pos)
        if not m:
            break
        pos = m.end()
        if m.group("lparen"):
            tokens.append(("LP", None))
        elif m.group("rparen"):
            tokens.append(("RP", None))
        elif m.group("neg"):
            tokens.append(("NOT", None))
        elif m.group("or"):
            tokens.append(("OR", None))
        elif m.group("field"):
            field = m.group("field").lower()
            val = m.group("value").strip('"').lower()
            if field in FIELDS:
                tokens.append(("TERM", (field, val)))
            else:  # unknown operator → treat the whole thing as text
                tokens.append(("TERM", ("any", f"{field}:{val}".lower())))
        elif m.group("word"):
            tokens.append(("TERM", ("any", m.group("word").strip('"').lower())))
    return tokens


# ────────────────────────────── parser ──────────────────────────────
class _Parser:
    def __init__(self, tokens):
        self.t = tokens
        self.i = 0

    def peek(self):
        return self.t[self.i][0] if self.i < len(self.t) else None

    def next(self):
        tok = self.t[self.i]
        self.i += 1
        return tok

    def parse(self):
        node = self.parse_or()
        return node

    def parse_or(self):
        nodes = [self.parse_and()]
        while self.peek() == "OR":
            self.next()
            nodes.append(self.parse_and())
        return nodes[0] if len(nodes) == 1 else ("or", nodes)

    def parse_and(self):
        nodes = []
        while self.peek() in ("TERM", "NOT", "LP"):
            nodes.append(self.parse_unary())
        if not nodes:
            return ("true", None)
        return nodes[0] if len(nodes) == 1 else ("and", nodes)

    def parse_unary(self):
        if self.peek() == "NOT":
            self.next()
            return ("not", self.parse_unary())
        return self.parse_primary()

    def parse_primary(self):
        kind, val = self.next()
        if kind == "LP":
            node = self.parse_or()
            if self.peek() == "RP":
                self.next()
            return node
        return ("term", val)


def compile_query(q: str):
    return _Parser(_tokenize(q)).parse()


# ────────────────────────────── evaluator ──────────────────────────────
def _match_term(field, value, msg):
    if field == "from":
        return value in msg["from"]
    if field == "to":
        return value in msg["to"]
    if field == "cc":
        return value in msg["cc"]
    if field == "subject":
        return value in msg["subject"]
    if field == "label":
        return any(value in l for l in msg["labels"])
    if field in ("list", "deliveredto"):
        return value in msg["to"] or value in msg["cc"]
    return value in msg["all"]


def evaluate(node, msg) -> bool:
    kind = node[0]
    if kind == "true":
        return True
    if kind == "term":
        return _match_term(node[1][0], node[1][1], msg)
    if kind == "not":
        return not evaluate(node[1], msg)
    if kind == "and":
        return all(evaluate(n, msg) for n in node[1])
    if kind == "or":
        return any(evaluate(n, msg) for n in node[1])
    return False


# ────────────────────────────── rule set ──────────────────────────────
class RuleSet:
    def __init__(self, path=RULES_PATH):
        self.rules = []
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
            for r in data.get("rules", []):
                self.rules.append({
                    "title": r["title"],
                    "label": r["label"],
                    "priority": r.get("priority", 50),
                    "ast": compile_query(r["query"]),
                })
            self.rules.sort(key=lambda r: r["priority"])
        except FileNotFoundError:
            pass  # no rules file → engine simply never matches

    def classify(self, sender="", to="", cc="", subject="", body="", labels=None):
        """Returns (label, rule_title) for the highest-priority matching rule,
        or (None, None) if nothing matched."""
        msg = {
            "from": (sender or "").lower(),
            "to": (to or "").lower(),
            "cc": (cc or "").lower(),
            "subject": (subject or "").lower(),
            "labels": [l.lower() for l in (labels or [])],
        }
        msg["all"] = " ".join([msg["from"], msg["to"], msg["cc"], msg["subject"], (body or "").lower()])
        for rule in self.rules:
            if evaluate(rule["ast"], msg):
                return rule["label"], rule["title"]
        return None, None


RULES = RuleSet()
