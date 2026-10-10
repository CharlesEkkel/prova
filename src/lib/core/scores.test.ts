import { describe, expect, it } from 'vitest';
import {
  choirChoiceAtUpload,
  choirScoreOf,
  defaultScoreLabel,
  fitScale,
  keyDirection,
  mayUploadScore,
  pageAfter,
  rememberPage,
  rememberedPage,
  scoreActionsFor,
  scoreIdOf,
  scoreLabelMaxLength,
  scoreOrder,
  swipeDirection,
  tapDirection,
  type Score,
  type ScoreId,
} from './scores';

const id = (n: number): ScoreId => {
  const found = scoreIdOf(`00000000-0000-0000-0000-00000000000${n.toString()}`);
  if (found === null) throw new Error('bad test id');
  return found;
};
const score = (n: number, isChoirScore = false): Score => ({
  id: id(n),
  label: `Score ${n.toString()}`,
  isChoirScore,
});

describe('scoreIdOf', () => {
  it('accepts a UUID and nothing else', () => {
    expect(scoreIdOf('00000000-0000-0000-0000-000000000001')).not.toBeNull();
    expect(scoreIdOf('not-an-id')).toBeNull();
    expect(scoreIdOf('')).toBeNull();
  });
});

describe('scoreOrder', () => {
  it('lists the choir score first and the rest as uploaded, without changing the input', () => {
    const scores = [score(1), score(2), score(3, true), score(4)];

    expect(scoreOrder(scores).map(({ id: scoreId }) => scoreId)).toEqual([
      id(3),
      id(1),
      id(2),
      id(4),
    ]);
    expect(scores.map(({ id: scoreId }) => scoreId)).toEqual([id(1), id(2), id(3), id(4)]);
  });

  it('keeps the order when there is no choir score', () => {
    expect(scoreOrder([score(2), score(1)]).map(({ id: scoreId }) => scoreId)).toEqual([
      id(2),
      id(1),
    ]);
  });
});

describe('choirScoreOf', () => {
  it('is the marked Score, or undefined when there is none', () => {
    expect(choirScoreOf([score(1), score(2, true)])?.id).toBe(id(2));
    expect(choirScoreOf([score(1)])).toBeUndefined();
  });
});

describe('what a Singer may do with Scores', () => {
  it('uploads with append', () => {
    expect(mayUploadScore(['read', 'append'])).toBe(true);
    expect(mayUploadScore(['read', 'update', 'delete'])).toBe(false);
  });

  it('shows Rename and Make this the choir score for update, and Delete for delete', () => {
    expect(scoreActionsFor(['read'])).toEqual([]);
    expect(scoreActionsFor(['read', 'update'])).toEqual(['rename', 'make-choir']);
    expect(scoreActionsFor(['read', 'delete'])).toEqual(['delete']);
    expect(scoreActionsFor(['read', 'update', 'delete'])).toEqual([
      'rename',
      'make-choir',
      'delete',
    ]);
  });
});

describe('choirChoiceAtUpload', () => {
  it('is on by default when the Piece has no choir score', () => {
    expect(choirChoiceAtUpload(['read', 'append'], [score(1)])).toBe('on');
    expect(choirChoiceAtUpload(['read', 'append'], [])).toBe('on');
  });

  it('is unavailable to append alone once the Piece has a choir score', () => {
    expect(choirChoiceAtUpload(['read', 'append'], [score(1, true)])).toBe('unavailable');
  });

  it('is offered, but off, to a Singer who may also update, since that replaces the choir score', () => {
    expect(choirChoiceAtUpload(['read', 'append', 'update'], [score(1, true)])).toBe('off');
  });
});

describe('defaultScoreLabel', () => {
  it.each([
    ['Requiem full score.pdf', 'Requiem full score'],
    ['Requiem.PDF', 'Requiem'],
    ['  Requiem   (alto)  .pdf', 'Requiem (alto)'],
    ['v1.2.final.pdf', 'v1.2.final'],
    ['notes', 'notes'],
    ['.pdf', ''],
  ])('turns %j into %j', (name, label) => {
    expect(defaultScoreLabel(name)).toBe(label);
  });

  it('is cut to the label limit', () => {
    expect(defaultScoreLabel(`${'x'.repeat(100)}.pdf`)).toBe('x'.repeat(scoreLabelMaxLength));
  });
});

describe('turning pages', () => {
  it('goes forward and back within the document', () => {
    expect(pageAfter(2, 5, 'forward')).toBe(3);
    expect(pageAfter(2, 5, 'back')).toBe(1);
  });

  it('stays on the first and last page', () => {
    expect(pageAfter(1, 5, 'back')).toBe(1);
    expect(pageAfter(5, 5, 'forward')).toBe(5);
  });

  it('keeps a remembered page inside a document that turned out shorter, and at least 1', () => {
    expect(pageAfter(9, 3, 'back')).toBe(3);
    expect(pageAfter(0, 3, 'forward')).toBe(1);
  });
});

describe('tapDirection', () => {
  it('forward on the right half and back on the left half', () => {
    expect(tapDirection(300, 400)).toBe('forward');
    expect(tapDirection(100, 400)).toBe('back');
    expect(tapDirection(201, 400)).toBe('forward');
    expect(tapDirection(199, 400)).toBe('back');
  });
});

describe('swipeDirection', () => {
  it('swiping left goes forward and right goes back', () => {
    expect(swipeDirection(-80, 5)).toBe('forward');
    expect(swipeDirection(80, -5)).toBe('back');
  });

  it('ignores a short or mostly vertical movement', () => {
    expect(swipeDirection(-20, 0)).toBeNull();
    expect(swipeDirection(-60, 90)).toBeNull();
    expect(swipeDirection(0, 0)).toBeNull();
  });
});

describe('keyDirection', () => {
  it.each([
    ['ArrowRight', 'forward'],
    ['ArrowDown', 'forward'],
    ['PageDown', 'forward'],
    ['ArrowLeft', 'back'],
    ['ArrowUp', 'back'],
    ['PageUp', 'back'],
  ])('reads %s as %s', (key, direction) => {
    expect(keyDirection(key)).toBe(direction);
  });

  it.each(['Enter', 'a', ' ', 'Tab', 'Escape'])('ignores %s', (key) => {
    expect(keyDirection(key)).toBeNull();
  });
});

describe('the page remembered for each Score', () => {
  it('starts every Score on page 1', () => {
    expect(rememberedPage({}, id(1))).toBe(1);
  });

  it('remembers each Score separately, without changing the earlier record', () => {
    const none = {};
    const one = rememberPage(none, id(1), 4);
    const two = rememberPage(one, id(2), 2);

    expect(none).toEqual({});
    expect(rememberedPage(one, id(1))).toBe(4);
    expect(rememberedPage(two, id(1))).toBe(4);
    expect(rememberedPage(two, id(2))).toBe(2);
  });
});

describe('fitScale', () => {
  it('fits the whole page inside the space, by the tighter side', () => {
    expect(fitScale({ width: 600, height: 800 }, { width: 300, height: 1000 })).toBe(0.5);
    expect(fitScale({ width: 600, height: 800 }, { width: 1200, height: 400 })).toBe(0.5);
  });

  it('is never zero or negative', () => {
    expect(fitScale({ width: 600, height: 800 }, { width: 0, height: 0 })).toBeGreaterThan(0);
    expect(fitScale({ width: 0, height: 0 }, { width: 100, height: 100 })).toBeGreaterThan(0);
  });
});
