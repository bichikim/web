# 4444

값을 받으면 출력하는 함수를 메모제이션 하는 함수를 만듭니다 아래와 같이 사용 됩니다
캐시 한도는 무한대 (지정 되지 않음) 입니다
```ts
/**
 * 완성 해야 될 함수 타입정의도 해주세요
 * @param func
 */
const memo = (func) => {
  // 이 함수는 완성 되지 않았습니다
  // return func()
}

/**
 * 사용 방법
 */

let count = 0

const add = (valueA, valueB) => {
  // 함수가 실행 됬는지 반별용 카운트
  count += 1
  return valueA + valueB
}

const memoizedAdd = memo(add)

// print 3
console.log(memoizedAdd(1, 2))

// print 1
console.log(count)

// 매개변수의 리턴값이 캐시되어 캐시된 값을 리턴한다  
// print 3
console.log(memoizedAdd(1, 2))

// 캐시 되었기 때문에 add 함수는 실행 되지 않는다
// print 1
console.log(count)

// print 4
console.log(memoizedAdd(2, 2))

// print 2
console.log(count)
```

