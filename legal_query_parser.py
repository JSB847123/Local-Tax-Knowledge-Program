from __future__ import annotations

from dataclasses import dataclass
from typing import Any


DEFAULT_SEARCH_FIELDS = ("title^3", "summary^2", "content", "documentNumber")

TOKEN_TERM = "TERM"
TOKEN_PHRASE = "PHRASE"
TOKEN_AND = "AND"
TOKEN_OR = "OR"
TOKEN_NOT = "NOT"
TOKEN_LPAREN = "LPAREN"
TOKEN_RPAREN = "RPAREN"


@dataclass(frozen=True)
class Token:
    """One lexical token from the user search string."""

    type: str
    value: str
    position: int


@dataclass(frozen=True)
class TermNode:
    """AST leaf: a normal term or an exact phrase."""

    value: str
    phrase: bool = False


@dataclass(frozen=True)
class NotNode:
    """AST unary operator: exclude the child expression."""

    child: "AstNode"


@dataclass(frozen=True)
class AndNode:
    """AST binary/n-ary operator: every child expression must match."""

    children: tuple["AstNode", ...]


@dataclass(frozen=True)
class OrNode:
    """AST binary/n-ary operator: at least one child expression must match."""

    children: tuple["AstNode", ...]


@dataclass(frozen=True)
class MatchAllNode:
    """AST fallback for empty or unusable input."""


AstNode = TermNode | NotNode | AndNode | OrNode | MatchAllNode


@dataclass(frozen=True)
class ParsedQuery:
    """Full parser output used by tests, APIs, and future Elasticsearch search."""

    query: str
    tokens: tuple[Token, ...]
    ast: AstNode
    dsl: dict[str, Any]
    fallback: bool
    warnings: tuple[str, ...]

    def to_dict(self) -> dict[str, Any]:
        return {
            "query": self.query,
            "tokens": [token_to_dict(token) for token in self.tokens],
            "ast": ast_to_dict(self.ast),
            "expression": ast_to_expression(self.ast),
            "dsl": self.dsl,
            "fallback": self.fallback,
            "warnings": list(self.warnings),
        }


@dataclass(frozen=True)
class TokenizeResult:
    tokens: tuple[Token, ...]
    fallback: bool
    warnings: tuple[str, ...]


def parse_legal_query_to_elasticsearch_dsl(
    query: str,
    fields: tuple[str, ...] | list[str] | None = None,
) -> ParsedQuery:
    """Tokenize, parse to AST, and convert a legal search string to ES query DSL."""

    search_fields = tuple(fields or DEFAULT_SEARCH_FIELDS)
    warnings: list[str] = []
    tokenized = tokenize_legal_query(query)
    warnings.extend(tokenized.warnings)

    if tokenized.fallback:
        ast = build_fallback_ast(query)
        return ParsedQuery(
            query=query,
            tokens=tokenized.tokens,
            ast=ast,
            dsl=ast_to_elasticsearch_dsl(ast, search_fields),
            fallback=True,
            warnings=tuple(warnings),
        )

    try:
        parser = QueryParser(tokenized.tokens)
        ast = parser.parse()
        warnings.extend(parser.warnings)
    except Exception as exc:
        warnings.append(f"parser fallback: {exc}")
        ast = build_fallback_ast(query)
        return ParsedQuery(
            query=query,
            tokens=tokenized.tokens,
            ast=ast,
            dsl=ast_to_elasticsearch_dsl(ast, search_fields),
            fallback=True,
            warnings=tuple(warnings),
        )

    if ast is None:
        ast = build_fallback_ast(query)
        warnings.append("empty parse fallback")
        fallback = True
    else:
        fallback = False

    return ParsedQuery(
        query=query,
        tokens=tokenized.tokens,
        ast=ast,
        dsl=ast_to_elasticsearch_dsl(ast, search_fields),
        fallback=fallback,
        warnings=tuple(warnings),
    )


def tokenize_legal_query(query: str) -> TokenizeResult:
    """Convert raw text into tokens without assigning operator precedence."""

    tokens: list[Token] = []
    warnings: list[str] = []
    index = 0
    paren_balance = 0
    phrase_count = 0
    text = query or ""
    operator_chars = set('"()!&*+|')

    while index < len(text):
        char = text[index]
        if char.isspace():
            index += 1
            continue

        if char == '"':
            end = index + 1
            value_chars: list[str] = []
            while end < len(text) and text[end] != '"':
                value_chars.append(text[end])
                end += 1
            if end >= len(text):
                warnings.append("unmatched quote fallback")
                return TokenizeResult(tuple(simple_fallback_tokens(text)), True, tuple(warnings))
            phrase = clean_text("".join(value_chars))
            if phrase:
                tokens.append(Token(TOKEN_PHRASE, phrase, index))
                phrase_count += 1
            index = end + 1
            continue

        if char in {"*", "&"}:
            tokens.append(Token(TOKEN_AND, char, index))
            index += 1
            continue
        if char in {"+", "|"}:
            tokens.append(Token(TOKEN_OR, char, index))
            index += 1
            continue
        if char == "!":
            tokens.append(Token(TOKEN_NOT, char, index))
            index += 1
            continue
        if char == "(":
            paren_balance += 1
            tokens.append(Token(TOKEN_LPAREN, char, index))
            index += 1
            continue
        if char == ")":
            paren_balance -= 1
            if paren_balance < 0:
                warnings.append("unmatched closing parenthesis fallback")
                return TokenizeResult(tuple(simple_fallback_tokens(text)), True, tuple(warnings))
            tokens.append(Token(TOKEN_RPAREN, char, index))
            index += 1
            continue

        start = index
        while index < len(text) and not text[index].isspace() and text[index] not in operator_chars:
            index += 1
        term = clean_text(text[start:index])
        if term:
            tokens.append(Token(TOKEN_TERM, term, start))

    if paren_balance != 0:
        warnings.append("unmatched opening parenthesis fallback")
        return TokenizeResult(tuple(simple_fallback_tokens(text)), True, tuple(warnings))

    if phrase_count > 1:
        warnings.append("multiple exact phrases fallback")
        return TokenizeResult(tuple(simple_fallback_tokens(text)), True, tuple(warnings))

    return TokenizeResult(tuple(tokens), False, tuple(warnings))


class QueryParser:
    """Recursive-descent parser implementing NOT > AND > OR precedence."""

    def __init__(self, tokens: tuple[Token, ...]):
        self.tokens = tokens
        self.index = 0
        self.warnings: list[str] = []

    def parse(self) -> AstNode | None:
        """Parse the whole token stream into an AST."""

        node = self.parse_or()
        while self.current() is not None:
            token = self.current()
            self.warnings.append(f"ignored token {token.value!r}")
            self.advance()
        return node

    def parse_or(self) -> AstNode | None:
        """Parse OR expressions; this is the lowest precedence level."""

        nodes = compact_nodes([self.parse_and()])
        while self.match(TOKEN_OR):
            while self.match(TOKEN_OR):
                self.warnings.append("ignored duplicate OR")
            right = self.parse_and()
            if right is not None:
                nodes.append(right)
        return collapse_or(nodes)

    def parse_and(self) -> AstNode | None:
        """Parse explicit AND and implicit whitespace AND expressions."""

        nodes = compact_nodes([self.parse_unary()])
        while True:
            token = self.current()
            if token is None or token.type in {TOKEN_RPAREN, TOKEN_OR}:
                break

            if token.type == TOKEN_AND:
                self.advance()
                while self.match(TOKEN_AND):
                    self.warnings.append("ignored duplicate AND")
                if self.current() is None or self.current().type in {TOKEN_RPAREN, TOKEN_OR}:
                    break
                right = self.parse_unary()
            elif starts_operand(token):
                right = self.parse_unary()
            else:
                self.warnings.append(f"ignored token {token.value!r}")
                self.advance()
                continue

            if right is not None:
                nodes.append(right)

        return collapse_and(nodes)

    def parse_unary(self) -> AstNode | None:
        """Parse NOT expressions before AND/OR grouping."""

        not_count = 0
        while self.match(TOKEN_NOT):
            not_count += 1
        node = self.parse_primary()
        if node is None:
            return None
        return NotNode(node) if not_count % 2 == 1 else node

    def parse_primary(self) -> AstNode | None:
        """Parse terms, exact phrases, and parenthesized subexpressions."""

        token = self.current()
        if token is None:
            return None
        if token.type == TOKEN_TERM:
            self.advance()
            return TermNode(token.value, phrase=False)
        if token.type == TOKEN_PHRASE:
            self.advance()
            return TermNode(token.value, phrase=True)
        if token.type == TOKEN_LPAREN:
            self.advance()
            node = self.parse_or()
            if not self.match(TOKEN_RPAREN):
                self.warnings.append("missing closing parenthesis")
            return node
        if token.type in {TOKEN_AND, TOKEN_OR}:
            self.warnings.append(f"ignored leading operator {token.value!r}")
            self.advance()
            return self.parse_primary()
        return None

    def current(self) -> Token | None:
        return self.tokens[self.index] if self.index < len(self.tokens) else None

    def advance(self) -> Token | None:
        token = self.current()
        if token is not None:
            self.index += 1
        return token

    def match(self, token_type: str) -> bool:
        if self.current() is not None and self.current().type == token_type:
            self.index += 1
            return True
        return False


def ast_to_elasticsearch_dsl(ast: AstNode, fields: tuple[str, ...] = DEFAULT_SEARCH_FIELDS) -> dict[str, Any]:
    """Convert an AST into Elasticsearch query DSL."""

    if isinstance(ast, MatchAllNode):
        return {"match_all": {}}

    if isinstance(ast, TermNode):
        query: dict[str, Any] = {
            "query": ast.value,
            "fields": list(fields),
        }
        if ast.phrase:
            query["type"] = "phrase"
        else:
            query["operator"] = "and"
        return {"multi_match": query}

    if isinstance(ast, NotNode):
        return {
            "bool": {
                "must": [{"match_all": {}}],
                "must_not": [ast_to_elasticsearch_dsl(ast.child, fields)],
            }
        }

    if isinstance(ast, AndNode):
        must: list[dict[str, Any]] = []
        must_not: list[dict[str, Any]] = []
        for child in ast.children:
            if isinstance(child, NotNode):
                must_not.append(ast_to_elasticsearch_dsl(child.child, fields))
            else:
                must.append(ast_to_elasticsearch_dsl(child, fields))
        bool_query: dict[str, Any] = {}
        if must:
            bool_query["must"] = must
        if must_not:
            bool_query["must_not"] = must_not
        if not bool_query:
            return {"match_all": {}}
        return {"bool": bool_query}

    if isinstance(ast, OrNode):
        return {
            "bool": {
                "should": [ast_to_elasticsearch_dsl(child, fields) for child in ast.children],
                "minimum_should_match": 1,
            }
        }

    return {"match_all": {}}


def build_fallback_ast(query: str) -> AstNode:
    """Build a safe simple-AND AST from malformed or unsupported input."""

    terms = [token.value for token in simple_fallback_tokens(query)]
    if not terms:
        return MatchAllNode()
    return collapse_and([TermNode(term) for term in terms]) or MatchAllNode()


def simple_fallback_tokens(query: str) -> list[Token]:
    """Extract searchable words while ignoring operators, quotes, and grouping."""

    cleaned_chars: list[str] = []
    for char in query or "":
        if char in {'"', "(", ")", "!", "&", "*", "+", "|"}:
            cleaned_chars.append(" ")
        else:
            cleaned_chars.append(char)
    tokens: list[Token] = []
    offset = 0
    for raw in clean_text("".join(cleaned_chars)).split():
        tokens.append(Token(TOKEN_TERM, raw, offset))
        offset += len(raw) + 1
    return tokens


def starts_operand(token: Token) -> bool:
    return token.type in {TOKEN_TERM, TOKEN_PHRASE, TOKEN_NOT, TOKEN_LPAREN}


def compact_nodes(nodes: list[AstNode | None]) -> list[AstNode]:
    return [node for node in nodes if node is not None]


def collapse_and(nodes: list[AstNode]) -> AstNode | None:
    if not nodes:
        return None
    flattened: list[AstNode] = []
    for node in nodes:
        if isinstance(node, AndNode):
            flattened.extend(node.children)
        else:
            flattened.append(node)
    if len(flattened) == 1:
        return flattened[0]
    return AndNode(tuple(flattened))


def collapse_or(nodes: list[AstNode]) -> AstNode | None:
    if not nodes:
        return None
    flattened: list[AstNode] = []
    for node in nodes:
        if isinstance(node, OrNode):
            flattened.extend(node.children)
        else:
            flattened.append(node)
    if len(flattened) == 1:
        return flattened[0]
    return OrNode(tuple(flattened))


def token_to_dict(token: Token) -> dict[str, Any]:
    return {"type": token.type, "value": token.value, "position": token.position}


def ast_to_dict(ast: AstNode) -> dict[str, Any]:
    if isinstance(ast, TermNode):
        return {"type": "term", "value": ast.value, "phrase": ast.phrase}
    if isinstance(ast, NotNode):
        return {"type": "not", "child": ast_to_dict(ast.child)}
    if isinstance(ast, AndNode):
        return {"type": "and", "children": [ast_to_dict(child) for child in ast.children]}
    if isinstance(ast, OrNode):
        return {"type": "or", "children": [ast_to_dict(child) for child in ast.children]}
    return {"type": "match_all"}


def ast_to_expression(ast: AstNode) -> str:
    """Render a compact, human-readable AST expression for tests and debugging."""

    if isinstance(ast, TermNode):
        return f'"{ast.value}"' if ast.phrase else ast.value
    if isinstance(ast, NotNode):
        return f"NOT {wrap_expression(ast.child, parent='not')}"
    if isinstance(ast, AndNode):
        return " AND ".join(wrap_expression(child, parent="and") for child in ast.children)
    if isinstance(ast, OrNode):
        return " OR ".join(wrap_expression(child, parent="or") for child in ast.children)
    return "*"


def wrap_expression(ast: AstNode, parent: str) -> str:
    expression = ast_to_expression(ast)
    if parent == "and" and isinstance(ast, (OrNode, NotNode)):
        return f"({expression})"
    if parent == "or" and isinstance(ast, AndNode):
        return f"({expression})"
    if parent == "not" and isinstance(ast, (AndNode, OrNode, NotNode)):
        return f"({expression})"
    return expression


def clean_text(value: str | None) -> str:
    return " ".join((value or "").split())
