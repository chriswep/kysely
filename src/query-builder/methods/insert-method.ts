import { ColumnNode, createColumnNode } from '../../operation-node/column-node'
import { FromItemNode } from '../../operation-node/from-node'
import {
  createInsertNode,
  InsertNode,
  InsertValuesNode,
} from '../../operation-node/insert-node'
import { isOperationNodeSource } from '../../operation-node/operation-node-source'
import { createPrimitiveValueListNode } from '../../operation-node/primitive-value-list-node'
import {
  createValueListNode,
  ListNodeItem,
} from '../../operation-node/value-list-node'
import { createValueNode } from '../../operation-node/value-node'
import { RawBuilder } from '../../raw-builder/raw-builder'
import { isPrimitive, PrimitiveValue } from '../../utils/object-utils'
import { AnyQueryBuilder, RowType } from '../type-utils'

export type InsertArg<DB, TB extends keyof DB, R = RowType<DB, TB>> = {
  [C in keyof R]?: R[C] | AnyQueryBuilder | RawBuilder<any>
}

type InsertValueType = PrimitiveValue | AnyQueryBuilder | RawBuilder<any>

export function parseInsertArgs(into: FromItemNode, args: any): InsertNode {
  if (!Array.isArray(args)) {
    args = [args]
  }

  const [columns, values] = parseInsertColumnsAndValues(args)
  return createInsertNode(into, columns, values)
}

function parseInsertColumnsAndValues(
  rows: InsertArg<any, any>[]
): [ReadonlyArray<ColumnNode>, ReadonlyArray<InsertValuesNode>] {
  const columns: string[] = []
  const values: InsertValuesNode[] = []

  for (const row of rows) {
    for (const column of Object.keys(row)) {
      if (!columns.includes(column)) {
        columns.push(column)
      }
    }
  }

  for (const row of rows) {
    const rowValues: InsertValueType[] = columns.map(() => null)

    for (const column of Object.keys(row)) {
      const columnIdx = columns.indexOf(column)
      rowValues[columnIdx] = row[column]
    }

    if (rowValues.every(isPrimitive)) {
      values.push(createPrimitiveValueListNode(rowValues))
    } else {
      values.push(createValueListNode(rowValues.map(parseValue)))
    }
  }

  return [columns.map(createColumnNode), values]
}

function parseValue(value: InsertValueType): ListNodeItem {
  if (isPrimitive(value)) {
    return createValueNode(value)
  } else if (isOperationNodeSource(value)) {
    return value.toOperationNode()
  } else {
    throw new Error(
      `unsupported value for insert object ${JSON.stringify(value)}`
    )
  }
}