import { StockItem, StockUnit, StockFilter } from '../types';

export type VoiceActionType = 'search' | 'filter' | 'create' | 'read' | 'update' | 'delete' | 'help' | 'unknown';

export interface VoiceCommandResult {
  action: VoiceActionType;
  transcript: string;
  feedback: string;
  spokenResponse: string;
  // Specific payloads
  searchQuery?: string;
  filterType?: StockFilter;
  tagFilter?: string | null;
  createdItem?: {
    itemName: string;
    quantity: number;
    unit: string;
    lowStockThreshold: number;
    notes?: string;
  };
  targetItem?: StockItem;
  quantityDelta?: number;
  newQuantity?: number;
}

// Map English number words to numbers
const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
  thousand: 1000,
};

export function convertWordsToNumbers(text: string): string {
  const tokens = text.split(/\s+/);
  const result: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const word = tokens[i].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (NUMBER_WORDS[word] !== undefined) {
      let val = NUMBER_WORDS[word];
      // Check compound like twenty five
      if (
        (val === 20 || val === 30 || val === 40 || val === 50 || val === 60 || val === 70 || val === 80 || val === 90) &&
        i + 1 < tokens.length
      ) {
        const nextWord = tokens[i + 1].toLowerCase().replace(/[^a-z0-9]/g, '');
        if (NUMBER_WORDS[nextWord] !== undefined && NUMBER_WORDS[nextWord] < 10) {
          val += NUMBER_WORDS[nextWord];
          i++;
        }
      }
      result.push(val.toString());
    } else {
      result.push(tokens[i]);
    }
  }

  return result.join(' ');
}

// Find closest matching item by name
export function findMatchingItem(items: StockItem[], query: string): StockItem | undefined {
  if (!items || items.length === 0 || !query) return undefined;
  const cleanQ = query.toLowerCase().trim();

  // 1. Exact match
  const exact = items.find((i) => i.itemName.toLowerCase() === cleanQ);
  if (exact) return exact;

  // 2. Starts with or includes
  const includes = items.find((i) => i.itemName.toLowerCase().includes(cleanQ));
  if (includes) return includes;

  // 3. Reverse includes (query contains item name)
  const reverse = items.find((i) => cleanQ.includes(i.itemName.toLowerCase()));
  if (reverse) return reverse;

  // 4. Token overlap
  const qTokens = cleanQ.split(/\s+/).filter((t) => t.length > 2);
  let bestItem: StockItem | undefined = undefined;
  let maxScore = 0;

  for (const item of items) {
    const itemTokens = item.itemName.toLowerCase().split(/\s+/);
    let score = 0;
    for (const qT of qTokens) {
      if (itemTokens.some((it) => it.includes(qT) || qT.includes(it))) {
        score++;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestItem = item;
    }
  }

  return maxScore > 0 ? bestItem : undefined;
}

// Find closest matching unit from available units
export function findMatchingUnit(units: StockUnit[], text: string): string | undefined {
  if (!units || units.length === 0 || !text) return undefined;
  const cleanT = text.toLowerCase().trim();

  for (const u of units) {
    const uName = u.name.toLowerCase();
    const uCode = (u.code || '').toLowerCase();
    // check singular / plural
    if (
      cleanT === uName ||
      cleanT === uName + 's' ||
      cleanT === uName.replace(/s$/, '') ||
      (uCode && cleanT === uCode)
    ) {
      return u.name;
    }
  }
  return undefined;
}

/**
 * Parses natural language voice speech transcripts into structured stock actions.
 */
export function parseVoiceCommand(
  rawTranscript: string,
  existingItems: StockItem[],
  availableUnits: StockUnit[]
): VoiceCommandResult {
  const normalized = convertWordsToNumbers(rawTranscript).trim();
  const lower = normalized.toLowerCase().replace(/[.,!?;:]/g, '');

  const defaultUnit = availableUnits[0]?.name || 'Pieces';

  // 1. FILTER COMMANDS
  if (
    lower.includes('show low stock') ||
    lower.includes('filter low stock') ||
    lower.includes('low stock items') ||
    lower.includes('low stock')
  ) {
    return {
      action: 'filter',
      transcript: rawTranscript,
      filterType: 'low_stock',
      feedback: 'Filtered table to Low Stock items',
      spokenResponse: 'Showing low stock items',
    };
  }

  if (
    lower.includes('show out of stock') ||
    lower.includes('filter out of stock') ||
    lower.includes('out of stock items') ||
    lower.includes('zero stock')
  ) {
    return {
      action: 'filter',
      transcript: rawTranscript,
      filterType: 'out_of_stock',
      feedback: 'Filtered table to Out of Stock items',
      spokenResponse: 'Showing out of stock items',
    };
  }

  if (
    lower.includes('show in stock') ||
    lower.includes('filter in stock') ||
    lower.includes('available items')
  ) {
    return {
      action: 'filter',
      transcript: rawTranscript,
      filterType: 'in_stock',
      feedback: 'Filtered table to In Stock items',
      spokenResponse: 'Showing in-stock items',
    };
  }

  if (
    lower === 'show all' ||
    lower === 'show all items' ||
    lower === 'clear filter' ||
    lower === 'reset filter' ||
    lower === 'all items'
  ) {
    return {
      action: 'filter',
      transcript: rawTranscript,
      filterType: 'all',
      searchQuery: '',
      tagFilter: null,
      feedback: 'Reset filter: Showing all inventory items',
      spokenResponse: 'Showing all items',
    };
  }

  // Tag filter commands (e.g. "filter by tag dairy", "filter tag beverage", "tag urgent", "clear tag")
  if (
    lower === 'clear tag' ||
    lower === 'clear tags' ||
    lower === 'clear tag filter' ||
    lower === 'reset tag' ||
    lower === 'all tags'
  ) {
    return {
      action: 'filter',
      transcript: rawTranscript,
      tagFilter: null,
      feedback: 'Cleared tag filter: Showing all tags',
      spokenResponse: 'Cleared tag filter',
    };
  }

  const tagMatch = lower.match(/^(?:filter\s+by\s+tag|filter\s+tag|tag\s+filter|show\s+tag)\s+(.+)$/i);
  if (tagMatch) {
    const rawTag = tagMatch[1].trim().replace(/^#+/, '');
    return {
      action: 'filter',
      transcript: rawTranscript,
      tagFilter: rawTag,
      feedback: `Filtered table to items tagged #${rawTag}`,
      spokenResponse: `Showing items tagged ${rawTag}`,
    };
  }

  // 2. SEARCH COMMANDS
  // e.g. "search for tea", "find milk", "look for bags"
  const searchMatch = lower.match(/^(?:search(?:\s+for)?|find|look\s+for|search\s+item)\s+(.+)$/i);
  if (searchMatch) {
    const query = searchMatch[1].trim();
    return {
      action: 'search',
      transcript: rawTranscript,
      searchQuery: query,
      feedback: `Searching inventory for "${query}"`,
      spokenResponse: `Searching for ${query}`,
    };
  }

  // 3. READ / INQUIRE COMMANDS
  // e.g. "how many boxes of tea do we have", "check stock of milk", "read stock of flour", "what is the stock of sugar"
  const checkStockMatch = lower.match(
    /(?:how\s+many|check\s+stock(?:\s+of)?|read\s+stock(?:\s+of)?|what\s+is\s+the\s+stock\s+of|stock\s+of|details\s+of|open\s+item)\s+(.+)/i
  );
  if (checkStockMatch) {
    let cleanTarget = checkStockMatch[1]
      .replace(/\s+(?:do\s+we\s+have|in\s+stock|available|left)\??$/i, '')
      .replace(/^(?:boxes\s+of|packets\s+of|units\s+of|bags\s+of|kg\s+of)\s+/i, '')
      .trim();

    const matchedItem = findMatchingItem(existingItems, cleanTarget);
    if (matchedItem) {
      const response = `${matchedItem.itemName} has ${matchedItem.quantity} ${matchedItem.unit} in stock.`;
      return {
        action: 'read',
        transcript: rawTranscript,
        targetItem: matchedItem,
        feedback: `${matchedItem.itemName}: ${matchedItem.quantity} ${matchedItem.unit}`,
        spokenResponse: response,
      };
    }
  }

  // 4. DELETE / REMOVE COMMANDS
  // e.g. "delete item tea", "remove apples", "delete sugar from stock"
  const deleteMatch = lower.match(/^(?:delete|remove|discard)\s+(?:item\s+)?(.+?)(?:\s+from\s+stock|\s+from\s+inventory)?$/i);
  if (deleteMatch) {
    const targetName = deleteMatch[1].trim();
    const matchedItem = findMatchingItem(existingItems, targetName);
    if (matchedItem) {
      return {
        action: 'delete',
        transcript: rawTranscript,
        targetItem: matchedItem,
        feedback: `Deleting "${matchedItem.itemName}" from inventory`,
        spokenResponse: `Deleted ${matchedItem.itemName} from inventory`,
      };
    } else {
      return {
        action: 'unknown',
        transcript: rawTranscript,
        feedback: `Cannot find item "${targetName}" to delete.`,
        spokenResponse: `Could not find ${targetName} to delete`,
      };
    }
  }

  // 5. UPDATE QUANTITY COMMANDS
  // Patterns:
  // a) "increase [item] by [number]" or "add [number] to [item]" or "add [number] [unit] to [item]"
  // b) "decrease/reduce [item] by [number]" or "deduct/subtract [number] from [item]"
  // c) "set [item] quantity/stock to [number]" or "update [item] to [number]"
  
  // Pattern 5a: increase by / add to
  const increaseMatch1 = lower.match(/^(?:increase|add)\s+(.+?)\s+by\s+(\d+(?:\.\d+)?)/i);
  if (increaseMatch1) {
    const itemName = increaseMatch1[1].replace(/^(?:item\s+)/, '').trim();
    const delta = parseFloat(increaseMatch1[2]);
    const matchedItem = findMatchingItem(existingItems, itemName);
    if (matchedItem && !isNaN(delta)) {
      const nextQty = matchedItem.quantity + delta;
      return {
        action: 'update',
        transcript: rawTranscript,
        targetItem: matchedItem,
        quantityDelta: delta,
        newQuantity: nextQty,
        feedback: `Increased "${matchedItem.itemName}" by +${delta} ${matchedItem.unit} (New Total: ${nextQty})`,
        spokenResponse: `Added ${delta} to ${matchedItem.itemName}. New total is ${nextQty} ${matchedItem.unit}.`,
      };
    }
  }

  const addToMatch = lower.match(/^add\s+(\d+(?:\.\d+)?)(?:\s+([a-zA-Z]+))?\s+(?:to|into)\s+(.+)$/i);
  if (addToMatch) {
    const qty = parseFloat(addToMatch[1]);
    const targetName = addToMatch[3].replace(/^(?:item\s+)/, '').trim();
    const matchedItem = findMatchingItem(existingItems, targetName);
    if (matchedItem && !isNaN(qty)) {
      const nextQty = matchedItem.quantity + qty;
      return {
        action: 'update',
        transcript: rawTranscript,
        targetItem: matchedItem,
        quantityDelta: qty,
        newQuantity: nextQty,
        feedback: `Added +${qty} ${matchedItem.unit} to "${matchedItem.itemName}" (New Total: ${nextQty})`,
        spokenResponse: `Added ${qty} to ${matchedItem.itemName}. New total is ${nextQty}.`,
      };
    }
  }

  // Pattern 5b: decrease / reduce / subtract
  const decreaseMatch1 = lower.match(/^(?:decrease|reduce|deduct)\s+(.+?)\s+by\s+(\d+(?:\.\d+)?)/i);
  if (decreaseMatch1) {
    const itemName = decreaseMatch1[1].replace(/^(?:item\s+)/, '').trim();
    const delta = parseFloat(decreaseMatch1[2]);
    const matchedItem = findMatchingItem(existingItems, itemName);
    if (matchedItem && !isNaN(delta)) {
      const nextQty = Math.max(0, matchedItem.quantity - delta);
      return {
        action: 'update',
        transcript: rawTranscript,
        targetItem: matchedItem,
        quantityDelta: -delta,
        newQuantity: nextQty,
        feedback: `Reduced "${matchedItem.itemName}" by -${delta} ${matchedItem.unit} (New Total: ${nextQty})`,
        spokenResponse: `Reduced ${matchedItem.itemName} by ${delta}. New total is ${nextQty}.`,
      };
    }
  }

  const subtractFromMatch = lower.match(/^(?:subtract|deduct|remove)\s+(\d+(?:\.\d+)?)(?:\s+([a-zA-Z]+))?\s+from\s+(.+)$/i);
  if (subtractFromMatch) {
    const qty = parseFloat(subtractFromMatch[1]);
    const targetName = subtractFromMatch[3].replace(/^(?:item\s+)/, '').trim();
    const matchedItem = findMatchingItem(existingItems, targetName);
    if (matchedItem && !isNaN(qty)) {
      const nextQty = Math.max(0, matchedItem.quantity - qty);
      return {
        action: 'update',
        transcript: rawTranscript,
        targetItem: matchedItem,
        quantityDelta: -qty,
        newQuantity: nextQty,
        feedback: `Subtracted ${qty} from "${matchedItem.itemName}" (New Total: ${nextQty})`,
        spokenResponse: `Subtracted ${qty} from ${matchedItem.itemName}. New total is ${nextQty}.`,
      };
    }
  }

  // Pattern 5c: set / update stock to [qty]
  const setStockMatch = lower.match(/^(?:set|update|change)\s+(?:stock\s+of\s+|item\s+)?(.+?)\s+(?:quantity|stock|level)?\s*to\s+(\d+(?:\.\d+)?)/i);
  if (setStockMatch) {
    const itemName = setStockMatch[1].trim();
    const newQty = parseFloat(setStockMatch[2]);
    const matchedItem = findMatchingItem(existingItems, itemName);
    if (matchedItem && !isNaN(newQty)) {
      return {
        action: 'update',
        transcript: rawTranscript,
        targetItem: matchedItem,
        newQuantity: newQty,
        quantityDelta: newQty - matchedItem.quantity,
        feedback: `Updated "${matchedItem.itemName}" stock to ${newQty} ${matchedItem.unit}`,
        spokenResponse: `Updated ${matchedItem.itemName} to ${newQty} ${matchedItem.unit}.`,
      };
    }
  }

  // 6. CREATE / ADD ITEM COMMANDS
  // Patterns:
  // a) "add [quantity] [unit] [item name]" e.g. "add 20 boxes of green tea", "add 15 kg rice"
  // b) "add [quantity] [item name]" e.g. "add 50 sugar", "add 10 milk"
  // c) "create item [name] with quantity [qty]" or "create [name] [qty] [unit]"
  // d) "new item [name] [qty] [unit]"
  
  // Pattern 6a & 6b:
  const createPattern1 = lower.match(/^(?:add|create|new\s+item|insert)\s+(?:new\s+item\s+|item\s+)?(\d+(?:\.\d+)?)\s*(?:(?:of\s+)?([a-zA-Z]+)\s+(?:of\s+)?)?(.+)$/i);
  if (createPattern1) {
    const qty = parseFloat(createPattern1[1]);
    const potentialUnit = createPattern1[2];
    let rawItemName = createPattern1[3].trim();

    // Check if potentialUnit is a recognized unit (e.g. boxes, kg, pieces)
    let matchedUnitName = defaultUnit;
    if (potentialUnit) {
      const foundUnit = findMatchingUnit(availableUnits, potentialUnit);
      if (foundUnit) {
        matchedUnitName = foundUnit;
      } else {
        // Not a unit, part of the item name!
        rawItemName = `${potentialUnit} ${rawItemName}`;
      }
    }

    // Clean item name from words like "with threshold 5" or "alert limit 3"
    let threshold = 5;
    const thresholdMatch = rawItemName.match(/\s+(?:with\s+)?(?:threshold|alert\s+limit|alert)\s+(\d+)/i);
    if (thresholdMatch) {
      threshold = parseInt(thresholdMatch[1], 10);
      rawItemName = rawItemName.replace(thresholdMatch[0], '').trim();
    }

    // Capitalize first letter of item name
    const cleanItemName = rawItemName
      .replace(/^of\s+/i, '')
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
      .trim();

    if (cleanItemName && !isNaN(qty) && qty >= 0) {
      return {
        action: 'create',
        transcript: rawTranscript,
        createdItem: {
          itemName: cleanItemName,
          quantity: qty,
          unit: matchedUnitName,
          lowStockThreshold: threshold,
        },
        feedback: `Created "${cleanItemName}" (${qty} ${matchedUnitName}, Alert ≤ ${threshold})`,
        spokenResponse: `Added ${qty} ${matchedUnitName} of ${cleanItemName} to inventory.`,
      };
    }
  }

  // Pattern 6c: "create item [name] quantity [qty]"
  const createPattern2 = lower.match(/^(?:create|add)\s+item\s+(.+?)\s+(?:quantity|qty|stock)\s+(\d+(?:\.\d+)?)(?:\s+unit\s+([a-zA-Z]+))?$/i);
  if (createPattern2) {
    const rawName = createPattern2[1].trim();
    const qty = parseFloat(createPattern2[2]);
    const unitWord = createPattern2[3];
    const unit = (unitWord && findMatchingUnit(availableUnits, unitWord)) || defaultUnit;
    const cleanName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

    return {
      action: 'create',
      transcript: rawTranscript,
      createdItem: {
        itemName: cleanName,
        quantity: qty,
        unit,
        lowStockThreshold: 5,
      },
      feedback: `Created "${cleanName}" (${qty} ${unit})`,
      spokenResponse: `Added ${qty} ${unit} of ${cleanName} to inventory.`,
    };
  }

  // 7. General search fallback: if user just speaks an item name or word, filter/search for it
  if (lower.length > 1) {
    // If it matches an existing item, show it or read it
    const matched = findMatchingItem(existingItems, lower);
    if (matched) {
      return {
        action: 'search',
        transcript: rawTranscript,
        searchQuery: matched.itemName,
        targetItem: matched,
        feedback: `Found "${matched.itemName}" with ${matched.quantity} ${matched.unit}`,
        spokenResponse: `Found ${matched.itemName}. Current stock is ${matched.quantity} ${matched.unit}.`,
      };
    }

    return {
      action: 'search',
      transcript: rawTranscript,
      searchQuery: rawTranscript.trim(),
      feedback: `Searching for "${rawTranscript.trim()}"`,
      spokenResponse: `Searching for ${rawTranscript.trim()}`,
    };
  }

  return {
    action: 'unknown',
    transcript: rawTranscript,
    feedback: `Could not recognize command: "${rawTranscript}"`,
    spokenResponse: 'Command not recognized. Try saying add 10 boxes of tea or search sugar.',
  };
}

/**
 * Speech synthesis helper
 */
export function speakText(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
  }
}
