# Use

Collection of essential Vue Composition Utilities

기본 함수 구조

MayRef 입력 (초기화 ref or 일반 값) + 추가 옵션 => useXXX 함수 (동작 준비) => 조작 Ref 또는 함수 리턴 (되도록 ref 로 제공)

리턴값 중 ValueRef 는 MayRef 와 바인딩을 시도 합니다 

즉 MayRef 가 바뀌면 리턴되는 ValueRef 도 바뀌고 리턴되는 ValueRef 를 바뀌어도 MayRef 를 바꾸려 시도 하고 바꿀 수 있다면 변경 합니다.

WrapRef 는 모든 제공되는 함수의 Ref 동작의 기본 사양 입니다.

WrapRef 는 리턴 값으로 ValueRef 를 리턴 합니다. WrapRef 에 입력된 MayRef 가 변경 가능 할때 리턴되는 ValueRef 값을 변경 하면 MayRef 도 변경 됩니다.
MayRef 를 변경 하면 리턴되는 ValueRef 도 변경 됩니다.

모든 Ref 를 입력 받고 리턴 받는 함수는 위와 같이 동작 합니다.

