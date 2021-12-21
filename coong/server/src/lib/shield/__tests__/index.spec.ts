import {isMatch} from '../'

describe('shield', () => {
  const readSelfPrivateRoles = {
    privateUser: {
      read: true,
      self: true,
    },
  }
  const allPrivateRoles = {
    privateUser: true,
  }

  const complexRoles = {
    privatePost: {
      create: true,
    },
    publicPost: {
      read: true,
    },
  }

  it('should pass roles with self', () => {
    const privateUserSelf = {
      privateUser: {
        self: true,
      },
    }

    const privateUserRead = {
      privateUser: {
        read: true,
      },
    }

    const privateUserBoth = {
      privateUser: {
        read: true,
        self: true,
      },
    }

    expect(isMatch(readSelfPrivateRoles, privateUserSelf)).toEqual({
      isSelf: true,
      match: {
        privateUser: {
          self: true,
        },
      },
      pass: true,
    })
  })
  it('should pass roles with self and read', () => {
    const privateUserBoth = {
      privateUser: {
        read: true,
        self: true,
      },
    }
    expect(isMatch(readSelfPrivateRoles, privateUserBoth)).toEqual({
      isSelf: true,
      match: {
        privateUser: {
          read: true,
          self: true,
        },
      },
      pass: true,
    })
  })
  it('should pass roles with read', () => {
    const privateUserRead = {
      privateUser: {
        read: true,
      },
    }
    expect(isMatch(readSelfPrivateRoles, privateUserRead)).toEqual({
      isSelf: false,
      match: {
        privateUser: {
          read: true,
        },
      },
      pass: true,
    })
  })
  it('should pass roles with all', () => {
    const privateUserAll = {
      privateUser: true,
    }

    expect(isMatch(readSelfPrivateRoles, privateUserAll)).toEqual({
      isSelf: true,
      match: {
        privateUser: {
          read: true,
          self: true,
        },
      },
      pass: true,
    })
  })
  it('should not pass roles with none', () => {
    const privateUserFalse = {
      privateUser: false,
    }

    const privateUserUndefined = {}

    expect(isMatch(readSelfPrivateRoles, privateUserFalse)).toEqual({
      isSelf: false,
      match: {},
      pass: false,
    })

    expect(isMatch(readSelfPrivateRoles, privateUserUndefined)).toEqual({
      isSelf: false,
      match: {},
      pass: false,
    })
  })
  it('should pass with true requiredRoles', () => {

    const privateUserRead = {
      privateUser: {
        read: true,
      },
    }

    expect(isMatch<'privateUser'>(allPrivateRoles, privateUserRead)).toEqual({
      isSelf: false,
      match: {
        privateUser: {
          read: true,
        },
      },
      pass: true,
    })
  })
})
